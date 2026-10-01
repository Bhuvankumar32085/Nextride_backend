import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./route/user.route.js";
import { connectDB } from "./config/db.js";
import {
  changeRejectedReason,
  finalApproable,
  locationUpdateRealTime,
  setRejectedReason,
  startAddNumber,
  startOnboardingConsumer,
  userStatusConsumer,
} from "./consumer/onboarding.consumer.js";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // frontend URL FRONTEND_URL
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const initConsumers = async () => {
  try {
    await Promise.all([
      startOnboardingConsumer(),
      startAddNumber(),
      changeRejectedReason(),
      setRejectedReason(),
      locationUpdateRealTime(),
      userStatusConsumer(),
      finalApproable(),
    ]);
    console.log("🐇 All Auth consumers initialized successfully");
  } catch (error) {
    console.error("⚠️ Warning: RabbitMQ consumer initialization failed:", error);
  }
};

initConsumers();

app.use("/api/v1/user", userRoutes);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Auth service is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to the database:", error);
  });

// check ci cd test 3 commit

