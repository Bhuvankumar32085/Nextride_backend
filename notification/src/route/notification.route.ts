import express from "express";
import {
  createOtp,
  sendMsgOnEmail,
  verifyOtp,
} from "../controller/notification.contreoller.js";
import { isAuth } from "../middlewares/isAuth.js";
const router = express.Router();

router.post("/create-otp", isAuth, createOtp);
router.post("/verify-otp", verifyOtp);
router.post("/send-message", isAuth, sendMsgOnEmail);

export default router;
