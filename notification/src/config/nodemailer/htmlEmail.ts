export const sendVerificationEmailHtmlContent = (otp: string) => {
  return `
  <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
    
    <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 10px; padding: 30px; text-align: center;">
      
      <h2 style="color: #333;">🔐 Email Verification</h2>
      
      <p style="color: #555; font-size: 16px;">
        Use the OTP below to verify your email address
      </p>

      <div style="margin: 30px 0;">
        <span style="
          display: inline-block;
          font-size: 28px;
          letter-spacing: 8px;
          font-weight: bold;
          color: #ffffff;
          background: #4CAF50;
          padding: 15px 25px;
          border-radius: 8px;
        ">
          ${otp}
        </span>
      </div>

      <p style="color: #777; font-size: 14px;">
        This OTP is valid for <b>5 minutes</b>. Do not share it with anyone.
      </p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

      <p style="color: #999; font-size: 12px;">
        If you didn’t request this, you can safely ignore this email.
      </p>

      <p style="margin-top: 20px; font-size: 14px; color: #555;">
        Thanks,<br/>
        <b>NextRide Team 🚀</b>
      </p>

    </div>

  </div>
  `;
};