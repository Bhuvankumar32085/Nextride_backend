import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import userRoutes from "./route/ride.router.js";
import { startPartnerApprovedConsumer } from "./consumer/onboarding.consumer.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // frontend URL
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

startPartnerApprovedConsumer();

app.use("/api/v1/ride", userRoutes);

connectDB()
  .then(() => {
    console.log("Connected to the database successfully");
    app.listen(PORT, () => {
      console.log(`Ride service is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to the database:", error);
  });
