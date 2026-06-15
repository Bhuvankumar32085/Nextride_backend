import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import bookingRoute from "./route/bookingRoute.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/booking", bookingRoute);

connectDB()
  .then(() => {
    console.log("Booking DB connected successfully");

    app.listen(PORT, () => {
      console.log(`Booking service is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Booking DB connection failed:", error);
  });
