import mongoose, { Document } from "mongoose";

type VehicleType = "car" | "bike" | "loading" | "truck" | "auto";

interface IVehicle extends Document {
  owner: mongoose.Types.ObjectId;
  type: VehicleType;
  vehcleModel: string;
  number: string;
  imageUrl?: {
    public_id: string;
    url: string;
  };
  baseFare?: number;
  pricePerKM?: number;
  waitingCharge?: number;
  status: "approved" | "pending" | "rejected";
  reasonForRejection?: string;
  vehiclePhoto?: {
    public_id: string;
    url: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new mongoose.Schema<IVehicle>(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["car", "bike", "loading", "truck", "auto"],
      required: true,
    },
    vehcleModel: { type: String, required: true },
    number: { type: String, required: true, unique: true },
    imageUrl: {
      public_id: { type: String },
      url: { type: String },
    },
    baseFare: { type: Number },
    pricePerKM: { type: Number, default: 0, min: 0 },
    waitingCharge: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "pending",
    },
    vehiclePhoto: {
      public_id: { type: String },
      url: { type: String },
    },
    reasonForRejection: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Vehicle = mongoose.model<IVehicle>("Vehicle", vehicleSchema);

export default Vehicle;
