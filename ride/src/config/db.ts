import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL as string);
    console.log("ride DB Connected");
  } catch (err) {
    console.error("ride DB connection error", err);
  }
};

