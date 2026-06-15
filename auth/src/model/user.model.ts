import mongoose, { Document } from "mongoose";

interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  createdAt: Date;
  googleId?: string;
  isVerifiedEmail: boolean;
  mobileNumber?: string;
  image?: string;
  role: "user" | "partner" | "admin";
  partnerStatus: "pending" | "approved" | "rejected";
  rejectedReason?: string;
  partnerOnboardingSteps?: number;
  videoKycStatus?:
    | "not_requested"
    | "pending"
    | "in_progress"
    | "approved"
    | "rejected";
  videoKycRoomId?: string;
  videoKycRejectedReason?: string;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
  isOnline: boolean;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    googleId: { type: String },
    isVerifiedEmail: { type: Boolean, default: false },
    mobileNumber: { type: String },
    image: { type: String },
    password: { type: String },
    partnerStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    partnerOnboardingSteps: { type: Number, default: 0, min: 0, max: 8 },
    role: { type: String, enum: ["user", "partner", "admin"], default: "user" },
    rejectedReason: { type: String },
    videoKycStatus: {
      type: String,
      enum: ["not_requested", "pending", "in_progress", "approved", "rejected"],
      default: "not_requested",
    },
    videoKycRoomId: { type: String },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },
    videoKycRejectedReason: { type: String },
  },
  { timestamps: true },
);

userSchema.index({ location: "2dsphere" });

const User = mongoose.model<IUser>("User", userSchema);

export default User;
