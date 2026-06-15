import mongoose, { Document } from "mongoose";

interface IPartnerBank extends Document {
  owner: mongoose.Types.ObjectId;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upi?: string;
  status: "not_added" | "added" | "verified";
  createdAt: Date;
  updatedAt: Date;
}

const PartnerBankSchema = new mongoose.Schema<IPartnerBank>(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    accountHolderName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true, uppercase: true },
    bankName: { type: String, required: true },
    upi: { type: String },
    status: {
      type: String,
      enum: ["not_added", "added", "verified"],
      default: "not_added",
    },
  },
  { timestamps: true },
);

const PartnerBank = mongoose.model<IPartnerBank>(
  "PartnerBank",
  PartnerBankSchema,
);

export default PartnerBank;
