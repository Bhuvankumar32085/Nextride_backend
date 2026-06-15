import express from "express";
import {
  acceptBookingByPartner,
  cancelRideByPartner,
  cancelRideByUser,
  cancleBookingByUser,
  completeRideByPartner,
  createBooking,
  createPaymentOrder,
  createPaymentOrderForCOD,
  generateDropOtp,
  getAdminDashboard,
  getBooking,
  getMyActiveBooking,
  getPartnerActiveRide,
  getPartnerBookings,
  getRideDetailsAndBookingDetailsForUser,
  getUserRide,
  razorpayWebhook,
  rejectBookingByPartner,
  startRideByPartner,
  verifyDropOtpAndCompleteRide,
  verifyPayment,
} from "../controller/bookingController.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/create-booking", isAuth, createBooking);
router.get("/bookings", isAuth, getBooking);
router.patch("/accept/:bookingId", isAuth, acceptBookingByPartner);
router.patch("/reject/:bookingId", isAuth, rejectBookingByPartner);
router.patch("/cancle/:bookingId", isAuth, cancleBookingByUser);
router.get(
  "/my-active-booking/:vehicleId/:driverId",
  isAuth,
  getMyActiveBooking,
); // for user
router.post("/create-payment-online-order", isAuth, createPaymentOrder);
router.post("/create-payment-cod-order", isAuth, createPaymentOrderForCOD);
router.post("/verify-payment", isAuth, verifyPayment);
router.post(
  "/razorpay/webhook",
  express.raw({
    type: "application/json",
  }),
  razorpayWebhook,
);
router.get("/partner/bookings", isAuth, getPartnerBookings);
router.get("/partner/active-ride", isAuth, getPartnerActiveRide);
router.get(
  "/ride-details/:bookingId",
  isAuth,
  getRideDetailsAndBookingDetailsForUser,
);
router.patch("/start-ride/:bookingId", isAuth, startRideByPartner);
router.patch("/cancel-ride/:bookingId", isAuth, cancelRideByPartner);
router.patch("/complete-ride/:bookingId", isAuth, completeRideByPartner);
router.patch("/cancel-ride-by-user/:bookingId", isAuth, cancelRideByUser);
router.get("/user-ride", isAuth, getUserRide);

router.post("/generate-drop-otp/:bookingId", isAuth, generateDropOtp);

router.post(
  "/verify-drop-otp/:bookingId",
  isAuth,
  verifyDropOtpAndCompleteRide,
);

router.get("/admin/dashboard", isAuth, getAdminDashboard);

export default router;
