import tryCatch from "../middlewares/tryCatch.js";
import User from "../model/user.model.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcryptjs";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { otpCreate } from "../config/otpCreate.js";
import axios from "axios";
import mongoose from "mongoose";
import { publishEvent } from "../config/rabbitmq.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const register = tryCatch(async (req, res) => {
  let { name, email, password } = req.body;
  if (!name || !email || !password) {
    res
      .status(400)
      .json({ message: "Please provide name, email and password" });
    return;
  }

  //check password length
  if (password.length < 6) {
    res.status(400).json({ message: "Password must be at least 6 characters" });
    return;
  }

  name = name.trim().toLowerCase();
  email = email.trim().toLowerCase();

  //   Check if user already exists
  const existingUser = await User.findOne({ email });

  if (existingUser && existingUser.isVerifiedEmail) {
    res.status(400).json({ message: "User already exists with this email" });
    return;
  } else {
    // if user exists but email is not verified then we can update the user with new name and password and send verification email again
    if (existingUser) {
      const hashedPassword = await bcrypt.hash(password, 10);
      existingUser.name = name;
      existingUser.password = hashedPassword;
      await existingUser.save();

      // return updates user
      const token = jwt.sign(
        {
          user: {
            name: existingUser.name,
            email: existingUser.email,
            _id: existingUser._id,
            role: existingUser.role,
          },
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "7d",
        },
      );

      const otp = otpCreate();
      // send otp to notification service
      const response = await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/api/v1/notification/create-otp`,
        {
          otp,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // afyer create send otp in email
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/api/v1/notification/send-message`,
        {
          email: existingUser.email,
          data: { otp },
          notificationType: "OTP_VERIFICATION",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return res.status(201).json({
        message:
          "User registered successfully but email is not verified, please verify your email",
        user: existingUser,
        token,
      });
    }
  }

  //  hased password
  const hashedPassword = await bcrypt.hash(password, 10);

  //   Create new user
  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    isVerifiedEmail: false,
    role: "user",
  });
  await newUser.save();

  const token = jwt.sign(
    {
      user: {
        name: newUser.name,
        email: newUser.email,
        _id: newUser._id,
        role: newUser.role,
      },
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "7d",
    },
  );

  // after some time we implement email verification and then we can send verification email to user and then we can activate the account after verification
  const otp = otpCreate();
  // send otp to notification service
  const response = await axios.post(
    `${process.env.NOTIFICATION_SERVICE_URL}/api/v1/notification/create-otp`,
    {
      otp,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  // afyer create send otp in email
  await axios.post(
    `${process.env.NOTIFICATION_SERVICE_URL}/api/v1/notification/send-message`,
    {
      email: newUser.email,
      data: { otp },
      notificationType: "OTP_VERIFICATION",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  res.status(201).json({
    message:
      "User registered successfully but email is not verified, please verify your email",
    user: newUser,
    token,
  });
});

export const googleLogin = tryCatch(async (req, res) => {
  const { token } = req.body;

  //  Verify Google Token
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID!,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    return res.status(400).json({ message: "Invalid Google token" });
  }

  const { email, name, picture, sub } = payload;

  if (!email) {
    return res.status(400).json({ message: "Email not found" });
  }

  const userName = name || "User";

  let user = await User.findOne({ email });
  let message = "Login Successfully";

  if (!user) {
    user = await User.create({
      name: userName,
      email,
      googleId: sub,
      isVerifiedEmail: true,
      image: picture || "",
      role: "user",
    });
    message = "Account Created Successfully";
  }
  //  Generate YOUR JWT
  const appToken = jwt.sign(
    {
      user: {
        name: user.name,
        email: user.email,
        _id: user._id,
        image: user.image,
        role: user.role,
      },
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" },
  );

  res.cookie("token", appToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    token: appToken,
    user,
    message,
  });
});

export const login = tryCatch(async (req, res) => {
  let { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: "Please provide email and password" });
    return;
  }

  email = email.trim().toLowerCase();

  const user = await User.findOne({ email });
  if (!user || !user.password) {
    res.status(400).json({ message: "Invalid email or password" });
    return;
  }

  if (!user.isVerifiedEmail) {
    res.status(400).json({ message: "Please verify your email before login" });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(400).json({ message: "Invalid email or password" });
    return;
  }

  const token = jwt.sign(
    {
      user: {
        name: user.name,
        email: user.email,
        _id: user._id,
        role: user.role,
      },
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" },
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    token,
    user,
    message: "Login Successfully",
  });
});

export const verifyEmailAfterOtpIsValid = tryCatch(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  user.isVerifiedEmail = true;
  await user.save();
  return res.status(200).json({ message: "Email verified successfully" });
});

export const getCurrentUser = tryCatch(async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token || token == undefined || token === "null") {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    return res.status(401).json({ message: "Unauthorized: No token" });
  }

  let decodedToken: JwtPayload;

  try {
    decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as JwtPayload;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    return res.status(401).json({ message: "Invalid token" });
  }

  if (!decodedToken?.user?._id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await User.findById(decodedToken.user._id).select("-password");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    success: true,
    user,
  });
});

export const logout = tryCatch(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  return res.json({ message: "Logged out successfully" });
});

export const findTotalPartner = tryCatch(async (req, res) => {
  const secret = req.headers["x-service-secret"];

  if (secret !== process.env.COMMUNICATION_SECRET) {
    return res.status(401).json({
      message: "Unauthorized service communication",
    });
  }

  const totalPartners = await User.countDocuments({
    role: "partner",
  });

  // approved partners
  const approvedPartners = await User.countDocuments({
    role: "partner",
    partnerStatus: "approved",
  });

  // pending partners
  const pendingPartners = await User.countDocuments({
    role: "partner",
    partnerStatus: "pending",
  });

  // rejected partners
  const rejectedPartners = await User.countDocuments({
    role: "partner",
    partnerStatus: "rejected",
  });

  const reviewPartners = await User.find({
    role: "partner",
    partnerOnboardingSteps: 3,
    // partnerStatus: "pending",
  })
    .select(
      "name email mobileNumber image partnerStatus partnerOnboardingSteps createdAt",
    )
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    message: "Total partners fetched",
    data: {
      totalPartners,
      approvedPartners,
      pendingPartners,
      rejectedPartners,
      reviewPartners,
    },
  });
});

export const getUserDetailsForAdmin = tryCatch(async (req, res) => {
  const secret = req.headers["x-service-secret"];

  if (secret !== process.env.COMMUNICATION_SECRET) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized service communication",
    });
  }

  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
});

export const partnerReview = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    // admin check
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    const { partnerId } = req.params;
    const { action, reason } = req.body;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: "Partner ID required",
        data: null,
      });
    }

    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action, must be 'approved' or 'rejected'",
        data: null,
      });
    }

    const partner = await User.findById(partnerId);

    if (!partner || partner.role !== "partner") {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
        data: null,
      });
    }

    partner.partnerStatus = action === "approved" ? "pending" : "rejected";
    partner.partnerOnboardingSteps = action === "approved" ? 4 : 3;

    if (action === "approved") {
      partner.videoKycStatus = "pending";
      try {
        await publishEvent("partner.approved", {
          event: "PARTNER_APPROVED",
          payload: {
            userId: partnerId,
          },
        });
      } catch (error) {
        console.log("Queue failed but API success", error);
      }
    } else {
      partner.rejectedReason = reason || "No reason provided";
    }

    await partner.save();

    return res.status(200).json({
      success: true,
      message: `Partner ${action}d successfully`,
      data: {
        partner,
      },
    });
  },
);

export const getPendingVideoKycPartners = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    // admin check
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    const partners = await User.find({
      role: "partner",
      partnerStatus: "pending",
      partnerOnboardingSteps: 4,
      videoKycStatus: { $in: ["pending", "in_progress"] },
    }).select("-password");

    return res.status(200).json({
      success: true,
      message: "Pending video KYC partners fetched successfully",
      data: {
        partners,
      },
    });
  },
);

export const startVideoKyc = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    // admin check
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    const { partnerId } = req.body;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: "Partner ID required",
        data: null,
      });
    }

    const partner = await User.findById(partnerId);

    if (!partner || partner.role !== "partner") {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
        data: null,
      });
    }

    // generate unique room id for video kyc
    const roomId = `kyc_${partnerId}_${Date.now()}`; // example: kyc_1234567890_1616161616161
    partner.videoKycRoomId = roomId;
    partner.videoKycStatus = "in_progress";
    await partner.save();

    try {
      await publishEvent("video-kyc-started", {
        event: "VIDEO_KYC_STARTED",
        payload: {
          userId: partnerId,
          partner,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    // same emit for admin
    try {
      await publishEvent("video-kyc-started", {
        event: "VIDEO_KYC_STARTED",
        payload: {
          userId: req.user?._id,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return res.status(200).json({
      success: true,
      message: "Video KYC started successfully",
      data: {
        roomId,
      },
    });
  },
);

export const handleVideoKycResult = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    // admin check
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    const { roomId, status, rejectionReason } = req.body;

    // check status must be either approved or rejected
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status, must be 'approved' or 'rejected'",
        data: null,
      });
    }

    // check if status is rejected then rejection reason must be provided
    if (status === "rejected" && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required when status is rejected",
        data: null,
      });
    }

    if (!roomId || !status) {
      return res.status(400).json({
        success: false,
        message: "Room ID and status are required",
        data: null,
      });
    }

    const partner = await User.findOne({ videoKycRoomId: roomId });

    if (!partner || partner.role !== "partner") {
      return res.status(404).json({
        success: false,
        message: "Partner not found for the given room ID",
        data: null,
      });
    }

    if (status === "approved") {
      partner.videoKycStatus = "approved";
      partner.partnerOnboardingSteps = 5; // onboarding complete
      partner.videoKycRejectedReason = "";
    } else {
      partner.videoKycStatus = "rejected";
      partner.partnerOnboardingSteps = 4;
      partner.videoKycRejectedReason =
        rejectionReason.trim() || "No reason provided";
    }

    await partner.save();

    // publish event to queue
    try {
      await publishEvent("video-kyc-result", {
        event: "VIDEO_KYC_RESULT",
        payload: {
          userId: partner._id,
          partner,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }
    // for admin dashboard
    try {
      await publishEvent("video-kyc-result-admin", {
        event: "VIDEO_KYC_RESULT_ADMIN",
        payload: {
          userId: req.user?._id,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return res.status(200).json({
      success: true,
      message: `Video KYC ${status} successfully`,
      status,
      data: {
        partner,
      },
    });
  },
);

export const handlePartnerVideoKysReApply = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== "partner") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    const partnerId = req.user._id;

    const partner = await User.findById(partnerId);

    if (!partner || partner.role !== "partner") {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
        data: null,
      });
    }
    if (partner.videoKycStatus !== "rejected") {
      return res.status(400).json({
        success: false,
        message: "Video KYC is not in rejected state",
        data: null,
      });
    }

    partner.videoKycStatus = "pending";
    partner.videoKycRejectedReason = "";
    await partner.save();

    // // publish event to queue for admin deshboard
    try {
      const admin = await User.findOne({ role: "admin" });

      await publishEvent("video-kyc-reapply", {
        event: "VIDEO_KYC_REAPPLY",
        payload: {
          userId: admin?._id,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return res.status(200).json({
      success: true,
      message: "Re-applied for video KYC successfully",
      data: {
        partner,
      },
    });
  },
);

export const checkPartnerOnboardingStatusIS6 = tryCatch(async (req, res) => {
  if (req.header("x-service-secret") !== process.env.COMMUNICATION_SECRET) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized service communication",
      data: null,
    });
  }

  const partnerIds = await User.find({
    role: "partner",
    partnerOnboardingSteps: 6,
  }).select("_id");

  return res.status(200).json({
    success: true,
    message: "Partner onboarding step 6 status fetched successfully",
    data: {
      partnerIds,
    },
  });
});

export const getPartnerWithIn5_Km = tryCatch(async (req, res) => {
  const { pickupLat, pickupLon, vehicleType } = req.body;

  if (pickupLat === undefined || pickupLon === undefined) {
    return res.status(400).json({
      success: false,
      message: "pickupLat and pickupLon are required",
      data: null,
    });
  }

  if (!vehicleType) {
    return res.status(400).json({
      success: false,
      message: "Vehicle Type is required",
      data: null,
    });
  }

  let ownerIds: string[] = [];
  let vehicles: any[] = [];

  try {
    const { data } = await axios.post(
      `${process.env.RIDER_SERVICE}/get-vehicle-by-vehicle-type`,
      {
        vehicleType,
      },
    );

    ownerIds = data.ownerIds;
    vehicles = data.data;
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch vehicles",
      data: null,
    });
  }

  const nearbyPartners = await User.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [Number(pickupLon), Number(pickupLat)],
        },
        distanceField: "distance",
        maxDistance: 5000,
        spherical: true,
      },
    },
    {
      $match: {
        role: "partner",
        isOnline: true,
        _id: {
          $in: ownerIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    },
  ]);

  const finalResult = nearbyPartners
    .map((partner) => {
      const vehicle = vehicles.find(
        (v) => v.owner.toString() === partner._id.toString(),
      );

      if (!vehicle) return null;

      return {
        ...partner,
        vehicle,
      };
    })
    .filter(Boolean);

  return res.status(200).json({
    success: true,
    message: "Nearby partners fetched successfully",
    totalPartners: finalResult.length,
    data: finalResult,
  });
});

export const getFinderById = tryCatch(async (req, res) => {
  const finderId = req.params.finderId as string;

  const finderRole = req.params.finderRole as "user" | "partner" | "admin";

  if (!finderId || !finderRole) {
    return res.status(400).json({
      success: false,
      message: "finderId and finderRole are required",
      data: null,
    });
  }

  const finder = await User.findOne({
    _id: finderId,
    role: finderRole,
  }).lean();

  if (!finder) {
    return res.status(404).json({
      success: false,
      message: `${finderRole} not found`,
      data: null,
    });
  }

  return res.status(200).json({
    success: true,
    message: `${finderRole} fetched successfully`,
    data: finder,
  });
});

export const addmobileNumber = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Please Login First",
        data: null,
      });
    }

    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Mobile Number is required",
        data: null,
      });
    }

    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid mobile number",
        data: null,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        mobileNumber,
      },
      {
        new: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Mobile Number Added Successfully",
      data: user,
    });
  },
);

export const getUserByIdInternal = tryCatch(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "userId Are required",
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "User fetched successfully",
    data: user,
  });
});
