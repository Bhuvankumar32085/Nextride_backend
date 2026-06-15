import mongoose, { Document } from "mongoose";

interface IPartnerDocs extends Document {
  owner: mongoose.Types.ObjectId;
  aadharCardUrl: {
    public_id: string;
    url: string;
  };
  rcUrl: {
    public_id: string;
    url: string;
  };
  licenseUrl: {
    public_id: string;
    url: string;
  };
  status: "approved" | "pending" | "rejected";
  reasonForRejection?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerDocsSchema = new mongoose.Schema<IPartnerDocs>(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    aadharCardUrl: {
      public_id: { type: String },
      url: { type: String },
    },
    rcUrl: {
      public_id: { type: String },
      url: { type: String },
    },
    licenseUrl: {
      public_id: { type: String },
      url: { type: String },
    },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "pending",
    },
    reasonForRejection: { type: String },
  },
  { timestamps: true },
);

const PartnerDocs = mongoose.model<IPartnerDocs>(
  "PartnerDocs",
  PartnerDocsSchema,
);

export default PartnerDocs;
