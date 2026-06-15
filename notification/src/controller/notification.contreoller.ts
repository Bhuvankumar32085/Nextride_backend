import axios from "axios";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import tryCatch from "../middlewares/tryCatch.js";
import Otp from "../model/notificatio.model.js";
import { sendOtpOnEmail } from "../config/nodemailer/email.js";

export const createOtp = tryCatch(async (req: AuthenticatedRequest, res) => {
  const { otp } = req.body;
  const user = req.user;

  if (!user) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  const email = user.email;

  if (!email) {
    res.status(400).json({
      message: "Email not found in token",
    });
  }

  if (!otp) {
    res.status(400).json({ message: "Please provide OTP" });
    return;
  }

  // if there is already an OTP for the email, delete it before creating a new one
  await Otp.deleteMany({ email });

  const newOtp = new Otp({
    email,
    otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // OTP expires in 5 minutes
  });
  await newOtp.save();
  res.status(201).json({ message: "OTP created successfully" });
});

export const verifyOtp = tryCatch(async (req, res) => {
  const { otp, email } = req.body;
  if (!otp || !email) {
    return res.status(400).json({ message: "OTP and email are required" });
  }

  const existingOtp = await Otp.findOne({ email, otp });

  if (!existingOtp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (existingOtp.expiresAt < new Date()) {
    await Otp.deleteOne({ _id: existingOtp._id }); // Delete expired OTP
    return res.status(400).json({ message: "OTP has expired" });
  } else {
    await Otp.deleteOne({ _id: existingOtp._id }); // OTP is valid, delete it after verificatio

   
    try {
      axios.post(`${process.env.AUTH_SERVICE_URL}/api/v1/user/verify-email`, {
        email,
      });
    } catch (error) {
      console.error("Error verifying email after OTP is valid:", error);
    }

    return res.status(200).json({ message: "OTP verified successfully" });
  }
});

export const sendMsgOnEmail = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    const { email, data, notificationType } = req.body;
   

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (notificationType === "OTP_VERIFICATION") {
      if (!data || !data.otp) {
        return res.status(400).json({ message: "OTP data is required" });
      }
      await sendOtpOnEmail(data.otp, email);

      return res.status(200).json({ message: "OTP email sent successfully" });
    }
  },
);
