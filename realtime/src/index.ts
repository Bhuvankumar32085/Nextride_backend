import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { initSocket } from "./realtime/socket.js";
import { socketHandler } from "./realtime/socketHandler.js";
import {
  finalReviewRejectionOrApproval,
  videoKycResult,
  videoKycResultForAdmin,
  videoKycStarted,
  videoKysReApply,
} from "./consumers/videoKycConsumer.js";
import {
  notifyPartnerForBooking,
  notifyUserForBookingByPartner,
} from "./consumers/bookingConsumer.js";
import chartRoute from "./route/chat.route.js";
import { connectDB } from "./configs/db.js";
dotenv.config();

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5004;
const server = http.createServer(app);
const io = initSocket(server);

app.get("/", (_, res) => {
  res.send("Realtime Service Running");
});

socketHandler(io);

const initConsumers = async () => {
  try {
    await Promise.all([
      videoKycStarted(),
      videoKycResult(),
      videoKysReApply(),
      videoKycResultForAdmin(),
      finalReviewRejectionOrApproval(),
      notifyPartnerForBooking(),
      notifyUserForBookingByPartner(),
    ]);
    console.log("🐇 All Realtime consumers initialized successfully");
  } catch (error) {
    console.error("⚠️ Warning: Realtime RabbitMQ consumers failed to initialize:", error);
  }
};

initConsumers();

app.use(chartRoute);

connectDB();
server.listen(PORT, () => {
  console.log(`Real Time service is running on port ${PORT}`);
});

 // check ci cd test 1 commit