import axios from "axios";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import tryCatch from "../middlewares/tryCatch.js";
import { serviceApi } from "../utils/serviceRequest.js";
import Booking from "../model/booking.model.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { publishEvent } from "../config/rabbitmq.js";
import crypto from "crypto";
import { razorpay } from "../config/razorpay.js";

export const createBooking = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    const {
      partnerId,
      vehicleId,
      pickup,
      dropoff,
      pickupLocation,
      dropLocation,
      userMobileNumber,
      driverMobileNumber,
      baseFare,
    } = req.body;

    if (!req.user || !req.user._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    if (
      !partnerId ||
      !vehicleId ||
      !pickup ||
      pickupLocation.length === 0 ||
      dropLocation.length === 0
    ) {
      return sendError(
        res,
        "All feaild are required like driverMobileNumber... etc",
      );
    }

    const driver = await serviceApi.get(
      `${process.env.AUTH_SERVICE_URL}/find/partner/${partnerId}`,
    );

    if (!driver || driver === null) {
      return sendError(res, "Driver Not Found");
    }

    const existBooking = await Booking.findOne({
      userId: req.user?._id,
      driverId: partnerId,
      vehicleId,
      bookingStatus: {
        $in: ["requested", "awaiting_payment", "confirmed", "started"],
      },
    });

    if (existBooking) {
      return sendSuccess(
        res,
        "Active booking already exists",
        existBooking,
        200,
      );
    }

    const booking = await Booking.create({
      userId: req.user?._id,
      driverId: partnerId,
      vehicleId,
      pickupAddress: pickup,
      dropAddress: dropoff,

      pickupLocation: {
        type: "Point",
        coordinates: pickupLocation,
      },

      dropLocation: {
        type: "Point",
        coordinates: dropLocation,
      },
      userMobileNumber,
      driverMobileNumber,
      fare: Number(baseFare),
      bookingStatus: "requested",
    });

    // sockit event emit for partner notifiy
    try {
      await publishEvent("notify-partner", {
        event: "NOTIFY_PARTNER_FOR_BOOKING",
        payload: {
          userId: partnerId.toString(),
          booking,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return sendSuccess(res, "Booking created Successsfully", booking);
  },
);

export const getMyActiveBooking = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const { driverId, vehicleId } = req.params;

    if (!driverId || !vehicleId) {
      return sendError(res, "Driver And Vehicle Ids are Required", null, 401);
    }

    const booking = await Booking.findOne({
      userId: req.user._id,
      driverId,
      vehicleId,
      bookingStatus: {
        $in: ["requested", "awaiting_payment", "confirmed", "started"],
      },
    }).sort({
      createdAt: -1,
    });

    return sendSuccess(res, "Booking fetched successfully", booking);
  },
);

export const getBooking = tryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user || !req.user._id) {
    return sendError(res, "Please Login First", null, 401);
  }

  const partnerId = req.user._id;

  const bookings = await Booking.find({
    driverId: partnerId,
    bookingStatus: "requested",
  }).sort({ createdAt: -1 });

  return sendSuccess(res, "Booking fetch Successsfully", bookings);
});

export const acceptBookingByPartner = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const { bookingId } = req.params;
    if (!bookingId) {
      return sendError(res, "Booking id is required", null, 401);
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      driverId: req.user._id,
    });

    if (!booking) {
      return sendError(res, "Booking Not Found", null, 404);
    }

    const activeBooking = await Booking.findOne({
      driverId: req.user._id,
      bookingStatus: {
        $in: ["awaiting_payment", "confirmed"],
      },
    });

    if (activeBooking) {
      return sendError(res, "You already have an active booking", null, 409);
    }

    if (booking.bookingStatus !== "requested") {
      return sendError(res, `Booking already ${booking.bookingStatus}`);
    }

    booking.bookingStatus = "awaiting_payment";
    booking.paymentDeadline = new Date(Date.now() + 5 * 60 * 1000);
    booking.expireAt = booking.paymentDeadline;

    await booking.save();
    try {
      await publishEvent("notify-user-by-partner", {
        event: "NOTIFY_USER_FOR_ACCEPT_BOOKING_BY_PARTNER",
        payload: {
          userId: booking.userId.toString(),
          booking,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return sendSuccess(res, "Booking accepted successfully", booking);
  },
);

export const cancleBookingByUser = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      return sendError(res, "Booking id is required", null, 401);
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user._id,
    });

    if (!booking) {
      return sendError(res, "Booking Not Found", null, 404);
    }

    booking.bookingStatus = "cancelled";

    await booking.save();

    try {
      await publishEvent("notify-partner", {
        event: "NOTIFY_PARTNER_IF_USER_CANCLE_BOOKING",
        payload: {
          userId: booking.driverId.toString(),
          booking,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return sendSuccess(res, "Booking cancle successfully", booking);
  },
);

export const rejectBookingByPartner = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      return sendError(res, "Booking id is required", null, 401);
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      driverId: req.user._id,
    });

    if (!booking) {
      return sendError(res, "Booking Not Found", null, 404);
    }

    if (booking.bookingStatus !== "requested") {
      return sendError(res, `Booking already ${booking.bookingStatus}`);
    }

    booking.bookingStatus = "rejected";

    try {
      await publishEvent("notify-user-by-partner", {
        event: "NOTIFY_USER_FOR_ACCEPT_BOOKING_BY_PARTNER",
        payload: {
          userId: booking.userId.toString(),
          booking,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    await booking.save();

    return sendSuccess(res, "Booking rejected successfully", booking);
  },
);

export const createPaymentOrder = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    const { bookingId, totalFare } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return sendError(res, "Booking not found", null, 404);
    }

    if (!totalFare) {
      return sendError(res, "Total Amount not found", null, 401);
    }

    const order = await razorpay.orders.create({
      amount: totalFare * 100, // paisa
      currency: "INR",
      receipt: booking._id.toString(),
    });

    booking.paymentStatusForOnline = "pending";
    booking.paymentMethod = "online";
    booking.razorpayOrderId = order.id;
    booking.bookingStatus = "awaiting_payment";
    booking.totalFare = Number(totalFare);
    await booking.save();

    return sendSuccess(res, "Order created", {
      orderId: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID,
      booking,
    });
  },
);

// Payment hone ke baad Razorpay automatically: handler(response) call karta h or es me digay ye teen value
// razorpay_order_id ,razorpay_payment_id ,razorpay_signature Ye teenon values Razorpay generate karta hai.
// Frontend nahi. hum bas Tum verify karte h hum generatedSignature banate h same razorpay_signature jesa
// Backend signature verify karta hai Razorpay ke secret se hum same signature dobara generate karte ho.
// Fir compare: generatedSignature === razorpay_signature Agar equal hai: Payment Genuine Agar nahi: Payment Fake
//
export const verifyPayment = tryCatch(async (req, res) => {
  const {
    bookingId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    return sendError(res, "Payment verification failed", null, 400);
  }

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return sendError(res, "Booking not found", null, 404);
  }

  const adminCommission = booking.totalFare! * 0.1;
  const partnerAmount = booking.totalFare! - adminCommission;

  booking.paymentStatusForOnline = "paid";
  booking.razorpayPaymentId = razorpay_payment_id;
  booking.bookingStatus = "confirmed";
  booking.adminCommission = adminCommission;
  booking.partnerAmount = partnerAmount;
  booking.set({
    paymentDeadline: null,
    expireAt: null,
  });

  await booking.save();

  try {
    await publishEvent("notify-partner", {
      event: "NOTIFY_PARTNER_IF_USER_SUCCESSFULLY_GET_PAYMNET",
      payload: {
        userId: booking.driverId.toString(),
        booking,
      },
    });
  } catch (error) {
    console.log("Queue failed but API success", error);
  }

  return sendSuccess(res, "Payment verified successfully", booking);
});

export const razorpayWebhook = tryCatch(async (req, res) => {
  const event = req.body.event;

  if (event === "payment.captured") {
    const payment = req.body.payload.payment.entity;

    const booking = await Booking.findOne({
      razorpayOrderId: payment.order_id,
    });

    if (booking) {
      const adminCommission = booking.totalFare! * 0.1;
      const partnerAmount = booking.totalFare! - adminCommission;

      booking.paymentStatusForOnline = "paid";
      booking.razorpayPaymentId = payment.id;
      booking.bookingStatus = "confirmed";
      booking.set({
        paymentDeadline: null,
        expireAt: null,
      });
      booking.adminCommission = adminCommission;
      booking.partnerAmount = partnerAmount;
      await booking.save();
    }
  }

  res.status(200).json({
    received: true,
  });
});

export const createPaymentOrderForCOD = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    const { bookingId, totalFare } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return sendError(res, "Booking not found", null, 404);
    }

    if (!totalFare) {
      return sendError(res, "Total Amount not found", null, 401);
    }

    // const adminCommission = Number(totalFare) * 0.1;
    // const partnerAmount = Number(totalFare) - adminCommission;

    booking.paymentMethod = "cod";
    booking.bookingStatus = "confirmed";
    booking.totalFare = Number(totalFare);
    booking.set({
      paymentDeadline: null,
      expireAt: null,
    });
    // booking.adminCommission = adminCommission;
    // booking.partnerAmount = partnerAmount;

    await booking.save();

    try {
      await publishEvent("notify-partner", {
        event: "NOTIFY_PARTNER_IF_USER_SUCCESSFULLY_GET_PAYMNET",
        payload: {
          userId: booking.driverId.toString(),
          booking,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return sendSuccess(res, "Order created Successfully", {
      booking,
    });
  },
);

export const getPartnerBookings = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const bookings = await Booking.find({
      driverId: req.user._id,
      bookingStatus: {
        $in: ["awaiting_payment", "confirmed"],
      },
    }).sort({ createdAt: -1 });

    if (!bookings) {
      return sendError(res, "Booking not found", null, 404);
    }

    return sendSuccess(res, "Partner bookings fetched successfully", bookings);
  },
);

export const getPartnerActiveRide = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const booking = await Booking.findOne({
      driverId: req.user._id,
      bookingStatus: {
        $in: ["confirmed", "started"],
      },
    }).sort({
      updatedAt: -1,
    });

    if (!booking) {
      return sendError(res, "No active ride found", null, 404);
    }

    return sendSuccess(res, "Active ride fetched successfully", booking);
  },
);

export const getRideDetailsAndBookingDetailsForUser = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      return sendError(res, "Booking id are required", null, 401);
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user._id,
      bookingStatus: {
        $in: ["confirmed", "started"],
      },
    });

    if (!booking) {
      return sendError(res, "Booking not found", null, 404);
    }

    const partner = await serviceApi.get(
      `${process.env.AUTH_SERVICE_URL}/internal/user/${booking.driverId}`,
    );

    return sendSuccess(res, "Ride details fetched successfully", {
      booking,
      partner,
    });
  },
);

export const startRideByPartner = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const { bookingId } = req.params;
    if (!bookingId) {
      return sendError(res, "Booking id required", null, 401);
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      driverId: req.user._id,
    });

    if (!booking) {
      return sendError(res, "Booking not found", null, 404);
    }

    if (booking.bookingStatus !== "confirmed") {
      return sendError(
        res,
        `Ride cannot be started. Current status is ${booking.bookingStatus}`,
      );
    }

    booking.bookingStatus = "started";

    await booking.save();

    try {
      await publishEvent("notify-user-by-partner", {
        event: "NOTIFY_USER_RIDE_STARTED",
        payload: {
          userId: booking.userId,
          booking,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return sendSuccess(res, "Ride started successfully", booking);
  },
);

export const cancelRideByPartner = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const { bookingId } = req.params;
    const { reason } = req.body;

    if (!bookingId) {
      return sendError(res, "Booking id required", null, 401);
    }

    if (!reason?.trim()) {
      return sendError(res, "Cancellation reason is required");
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      driverId: req.user._id,
    });

    if (!booking) {
      return sendError(res, "Booking not found", null, 404);
    }

    if (booking.bookingStatus === "completed") {
      return sendError(res, "Completed ride cannot be cancelled");
    }

    booking.bookingStatus = "cancelled";
    booking.cancelledBy = "partner";
    booking.cancleBookingReason = reason || "";

    await booking.save();

    try {
      await publishEvent("notify-user-by-partner", {
        event: "NOTIFY_USER_RIDE_CANCELLED",
        payload: {
          userId: booking.userId,
          booking,
          reason,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return sendSuccess(res, "Ride cancelled successfully", booking);
  },
);
//
export const generateDropOtp = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      return sendError(res, "Booking id required", null, 401);
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      driverId: req.user._id,
    });

    if (!booking) {
      return sendError(res, "Booking not found", null, 404);
    }

    if (booking.bookingStatus !== "started") {
      return sendError(res, "Ride must be started first", null, 400);
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    booking.dropOtp = otp;

    booking.dropOtpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await booking.save();

    await publishEvent("notify-user-by-partner", {
      event: "NOTIFY_USER_FOR_OTP",
      payload: {
        userId: booking.userId,
        booking,
      },
    });

    return sendSuccess(res, "Drop OTP generated", {
      otp,
    });
  },
);

export const verifyDropOtpAndCompleteRide = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const { bookingId } = req.params;

    const { otp } = req.body;

    if (!bookingId) {
      return sendError(res, "Booking id required", null, 401);
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      driverId: req.user._id,
    });

    if (!booking) {
      return sendError(res, "Booking not found", null, 404);
    }

    if (booking.bookingStatus !== "started") {
      return sendError(res, "Ride is not active", null, 400);
    }

    if (!booking.dropOtp || booking.dropOtp !== otp) {
      return sendError(res, "Invalid OTP", null, 400);
    }

    if (booking.dropOtpExpires && booking.dropOtpExpires < new Date()) {
      return sendError(res, "OTP expired", null, 400);
    }

    const totalFare = booking.totalFare || 0;

    const adminCommission = Math.round(totalFare * 0.1);

    const partnerAmount = totalFare - adminCommission;

    booking.bookingStatus = "completed";

    booking.adminCommission = adminCommission;

    booking.partnerAmount = partnerAmount;

    booking.dropOtp = "";

    booking.dropOtpExpires = null;

    if (booking.paymentMethod === "cod") {
      booking.paymentStatusForOnline = "paid";
    }

    await booking.save();

    await publishEvent("notify-user-by-partner", {
      event: "NOTIFY_USER_RIDE_COMPLETED",
      payload: {
        userId: booking.userId,
        booking,
      },
    });

    return sendSuccess(res, "Ride completed successfully", booking);
  },
);

export const completeRideByPartner = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const { bookingId } = req.params;
    if (!bookingId) {
      return sendError(res, "Booking id required", null, 401);
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      driverId: req.user._id,
    });

    if (!booking) {
      return sendError(res, "Booking not found", null, 404);
    }

    if (booking.bookingStatus !== "started") {
      return sendError(
        res,
        `Ride is ${booking.bookingStatus}. Only started rides can be completed.`,
      );
    }

    // Commission Calculation
    const totalFare = booking.totalFare;

    const adminCommission = Math.round(totalFare! * 0.1); // 10%

    const partnerAmount = totalFare! - adminCommission;

    booking.bookingStatus = "completed";

    booking.adminCommission = adminCommission;

    booking.partnerAmount = partnerAmount;

    // COD ride completed
    if (booking.paymentMethod === "cod") {
      booking.paymentStatusForOnline = "paid";
    }

    await booking.save();

    try {
      await publishEvent("notify-user-by-partner", {
        event: "NOTIFY_USER_RIDE_COMPLETED",
        payload: {
          userId: booking.userId,
          booking,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return sendSuccess(res, "Ride completed successfully", booking);
  },
);

export const cancelRideByUser = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return sendError(res, "Please Login First", null, 401);
    }

    const { bookingId } = req.params;
    const { reason } = req.body;

    if (!bookingId) {
      return sendError(res, "Booking id Required", null, 401);
    }

    if (!reason?.trim()) {
      return sendError(res, "Cancellation reason is required");
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user._id,
    });

    if (!booking) {
      return sendError(res, "Booking not found", null, 404);
    }

    if (booking.bookingStatus === "completed") {
      return sendError(res, "Completed ride cannot be cancelled");
    }

    if (booking.bookingStatus === "cancelled") {
      return sendError(res, "Ride already cancelled");
    }

    booking.bookingStatus = "cancelled";

    booking.cancelledBy = "user";

    booking.cancleBookingReason = reason.trim();

    await booking.save();

    try {
      await publishEvent("notify-partner", {
        event: "NOTIFY_PARTNER_RIDE_CANCELLED_BY_USER",
        payload: {
          userId: booking.driverId,
          booking,
          reason,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return sendSuccess(res, "Ride cancelled successfully", booking);
  },
);

export const getUserRide = tryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user?._id) {
    return sendError(res, "Please Login First", null, 401);
  }

  const booking = await Booking.findOne({
    userId: req.user._id,
    bookingStatus: {
      $in: ["started", "confirmed"],
    },
  }).sort({
    updatedAt: -1,
  });

  if (!booking) {
    return sendError(res, "Ride not found", null, 404);
  }

  return sendSuccess(res, "Ride fetched successfully", booking);
});

export const getAdminDashboard = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return sendError(res, "Please Login First", null, 401);
    }

    if (req.user.role !== "admin") {
      return sendError(res, "You are not authorized", null, 403);
    }

    const today = new Date();

    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const sevenDaysAgo = new Date();

    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // =====================================================
    // REVENUE DATA
    // =====================================================

    const completedBookings = await Booking.find({
      bookingStatus: "completed",
    });

    const totalRevenue = completedBookings.reduce(
      (sum, booking) => sum + (booking.adminCommission || 0),
      0,
    );

    const totalFareCollected = completedBookings.reduce(
      (sum, booking) => sum + (booking.totalFare || 0),
      0,
    );

    const totalPartnerPayout = completedBookings.reduce(
      (sum, booking) => sum + (booking.partnerAmount || 0),
      0,
    );

    const totalCompletedRides = completedBookings.length;

    // =====================================================
    // TODAY REVENUE
    // =====================================================

    const todayBookings = await Booking.find({
      bookingStatus: "completed",
      updatedAt: {
        $gte: startOfToday,
      },
    });

    const todayRevenue = todayBookings.reduce(
      (sum, booking) => sum + (booking.adminCommission || 0),
      0,
    );

    // =====================================================
    // LAST 7 DAYS REVENUE
    // =====================================================

    const last7DaysBookings = await Booking.find({
      bookingStatus: "completed",
      updatedAt: {
        $gte: sevenDaysAgo,
      },
    });

    const last7DaysRevenue = last7DaysBookings.reduce(
      (sum, booking) => sum + (booking.adminCommission || 0),
      0,
    );

    // =====================================================
    // CANCELLATION DATA
    // =====================================================

    const totalCancelledRides = await Booking.countDocuments({
      bookingStatus: "cancelled",
    });

    const cancelledByUser = await Booking.countDocuments({
      bookingStatus: "cancelled",
      cancelledBy: "user",
    });

    const cancelledByPartner = await Booking.countDocuments({
      bookingStatus: "cancelled",
      cancelledBy: "partner",
    });

    // =====================================================
    // PARTNER ANALYTICS
    // =====================================================

    const partnerStats = await Booking.aggregate([
      {
        $group: {
          _id: "$driverId",

          totalBookings: {
            $sum: 1,
          },

          completedBookings: {
            $sum: {
              $cond: [
                {
                  $eq: ["$bookingStatus", "completed"],
                },
                1,
                0,
              ],
            },
          },

          cancelledBookings: {
            $sum: {
              $cond: [
                {
                  $eq: ["$bookingStatus", "cancelled"],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const partnersAnalytics = partnerStats.map((partner) => {
      const completionRate =
        partner.totalBookings > 0
          ? Number(
              (
                (partner.completedBookings / partner.totalBookings) *
                100
              ).toFixed(2),
            )
          : 0;

      const cancellationRate =
        partner.totalBookings > 0
          ? Number(
              (
                (partner.cancelledBookings / partner.totalBookings) *
                100
              ).toFixed(2),
            )
          : 0;

      return {
        partnerId: partner._id,

        totalBookings: partner.totalBookings,

        completedBookings: partner.completedBookings,

        cancelledBookings: partner.cancelledBookings,

        completionRate,

        cancellationRate,
      };
    });

    const eligiblePartners = partnersAnalytics.filter(
      (partner) => partner.totalBookings >= 5,
    );

    const bestPartner = eligiblePartners.sort(
      (a, b) => b.completionRate - a.completionRate,
    )[0];

    const worstPartner = eligiblePartners.sort(
      (a, b) => b.cancellationRate - a.cancellationRate,
    )[0];

    // =====================================================
    // FETCH PARTNER DETAILS
    // =====================================================

    let topCompletedPartner = null;
    let topCancelledPartner = null;

    if (bestPartner?.partnerId) {
      try {
        const partner = await serviceApi.get(
          `${process.env.AUTH_SERVICE_URL}/internal/user/${bestPartner.partnerId}`,
        );

        topCompletedPartner = {
          partner,

          totalBookings: bestPartner.totalBookings,

          completedBookings: bestPartner.completedBookings,

          cancelledBookings: bestPartner.cancelledBookings,

          completionRate: bestPartner.completionRate,

          cancellationRate: bestPartner.cancellationRate,
        };
      } catch (error) {
        console.log("TOP COMPLETED PARTNER ERROR", error);
      }
    }

    if (worstPartner?.partnerId) {
      try {
        const partner = await serviceApi.get(
          `${process.env.AUTH_SERVICE_URL}/internal/user/${worstPartner.partnerId}`,
        );

        topCancelledPartner = {
          partner,

          totalBookings: worstPartner.totalBookings,

          completedBookings: worstPartner.completedBookings,

          cancelledBookings: worstPartner.cancelledBookings,

          completionRate: worstPartner.completionRate,

          cancellationRate: worstPartner.cancellationRate,
        };
      } catch (error) {
        console.log("TOP CANCELLED PARTNER ERROR", error);
      }
    }

    // =====================================================
    // RECENT EARNINGS
    // =====================================================

    const recentEarnings = await Booking.find({
      bookingStatus: "completed",
    })
      .sort({
        updatedAt: -1,
      })
      .limit(20)
      .select(
        `
          _id
          userId
          driverId
          totalFare
          adminCommission
          partnerAmount
          paymentMethod
          updatedAt
        `,
      );

    // =====================================================
    // RESPONSE
    // =====================================================

    return sendSuccess(res, "Revenue analytics fetched", {
      summary: {
        totalRevenue,
        todayRevenue,
        last7DaysRevenue,

        totalFareCollected,
        totalPartnerPayout,

        totalCompletedRides,
        totalCancelledRides,

        cancelledByUser,
        cancelledByPartner,
      },

      topCompletedPartner,

      topCancelledPartner,

      recentEarnings,
    });
  },
);
