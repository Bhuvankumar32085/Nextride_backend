import mongoose, { Document } from "mongoose";

export type IBookingStatus =
  | "idle"
  | "requested"
  | "awaiting_payment"
  | "confirmed"
  | "started"
  | "completed"
  | "cancelled"
  | "rejected"
  | "expired";

export interface IBooking extends Document {
  userId: string;
  driverId: string;
  vehicleId: string;

  pickupAddress: string;
  dropAddress: string;

  pickupLocation: {
    type: "Point";
    coordinates: [number, number];
  };

  dropLocation: {
    type: "Point";
    coordinates: [number, number];
  };

  distance?: number;

  fare: number;

  userMobileNumber: string;
  driverMobileNumber: string;

  bookingStatus: IBookingStatus;

  adminCommission?: number;
  partnerAmount?: number;

  pickupOtp?: string;
  pickupOtpExpires?: Date;

  dropOtp?: string;
  dropOtpExpires?: Date | null;

  paymentDeadline?: Date;

  paymentStatusForOnline?: "pending" | "paid" | "failed";
  paymentMethod?: "online" | "cod";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  totalFare?: number;

  cancleBookingReason?: string;
  cancelledBy?: "user" | "partner";

  expireAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const bookingSchema = new mongoose.Schema<IBooking>(
  {
    userId: {
      type: String,
      required: true,
    },

    driverId: {
      type: String,
      required: true,
    },

    vehicleId: {
      type: String,
      required: true,
    },

    pickupAddress: {
      type: String,
      required: true,
      trim: true,
    },

    dropAddress: {
      type: String,
      required: true,
      trim: true,
    },

    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        required: true,
      },
    },

    dropLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        required: true,
      },
    },

    distance: {
      type: Number,
      default: 0,
      min: 0,
    },

    fare: {
      type: Number,
      required: true,
      min: 0,
    },

    totalFare: {
      type: Number,
      min: 0,
    },

    userMobileNumber: {
      type: String,
      required: true,
    },

    driverMobileNumber: {
      type: String,
      required: true,
    },

    cancelledBy: {
      type: String,
      enum: ["user", "partner"],
    },

    bookingStatus: {
      type: String,
      enum: [
        "idle",
        "requested",
        "awaiting_payment",
        "confirmed",
        "started",
        "completed",
        "cancelled",
        "rejected",
        "expired",
      ],
      default: "idle",
      index: true,
    },

    paymentDeadline: {
      type: Date,
    },

    adminCommission: {
      type: Number,
      default: 0,
      min: 0,
    },

    partnerAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    pickupOtp: {
      type: String,
      default: "",
    },

    pickupOtpExpires: {
      type: Date,
    },
    cancleBookingReason: {
      type: String,
    },

    dropOtp: {
      type: String,
      default: "",
    },

    dropOtpExpires: {
      type: Date,
    },

    paymentStatusForOnline: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["online", "cod"],
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,

    expireAt: {
      type: Date,
      index: {
        expires: 0,
      },
    },
  },
  {
    timestamps: true,
  },
); //paymentStatus

bookingSchema.index({ pickupLocation: "2dsphere" });
bookingSchema.index({ dropLocation: "2dsphere" });

const Booking = mongoose.model<IBooking>("Booking", bookingSchema);

export default Booking;
