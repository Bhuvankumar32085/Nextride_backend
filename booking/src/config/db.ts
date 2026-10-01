import mongoose from "mongoose";
import dns from "node:dns";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // Ignore
}

export const connectDB = async () => {
  const mongoUrl = (process.env.MONGO_URL || "").trim();
  if (!mongoUrl) {
    throw new Error("MONGO_URL environment variable is not defined");
  }
  try {
    await mongoose.connect(mongoUrl);
    console.log("Booking DB Connected successfully");
  } catch (err: any) {
    console.error("Booking DB connection error:", err.message || err);
  }
};


