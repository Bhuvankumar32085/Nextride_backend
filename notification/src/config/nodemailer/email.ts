import { sendVerificationEmailHtmlContent } from "./htmlEmail.js";
import { transporter } from "./nodeemail.js";

const FROM_EMAIL = '"NextRide-App" <no-reply@pateleats.com>';

export const sendOtpOnEmail = async (otp: string, email: string) => {
  const html = sendVerificationEmailHtmlContent(otp);
  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Your OTP for Email Verification",
      html,
    });
  } catch (error) {
    console.error(error);
    throw new Error("Failed to send OTP email");
  }
};
