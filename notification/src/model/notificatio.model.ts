import mongoose, { Document } from "mongoose";

interface IOtp extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OtpSchema = new mongoose.Schema<IOtp>(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true }, // Expiration time is set to 5 minutes after creation
  },
  { timestamps: true },
);

const Otp = mongoose.model<IOtp>("Otp", OtpSchema);

export default Otp;
