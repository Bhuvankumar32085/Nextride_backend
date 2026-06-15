import mongoose from "mongoose";
import { AuthenticatedRequest, IUser } from "../middlewares/isAuth.js";
import tryCatch from "../middlewares/tryCatch.js";
import Vehicle from "../model/vehicle.model.js";
import { publishEvent } from "../config/rabbitmq.js";
import generateBase64Image from "../middlewares/datauri.js";
import axios from "axios";
import PartnerDocs from "../model/partnerDocs.model.js";
import PartnerBank from "../model/partnerbanc.model.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { on } from "cluster";

export const addVehicleAndUpdate = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    let { type, number, vehcleModel } = req.body;

    if (!type || !number || !vehcleModel) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    number = number.toUpperCase();

    //  check vichele number is valid using ragular expression
    const vehicleNumberRegex = /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/;
    if (!vehicleNumberRegex.test(number)) {
      res.status(400).json({ message: "Invalid vehicle number format" });
      return;
    }

    // 🚨 check global uniqueness (best practice)
    const alreadyExists = await Vehicle.findOne({ number });

    if (alreadyExists && !alreadyExists.owner.equals(user._id)) {
      return res.status(400).json({
        message: "Vehicle number already registered",
      });
    }

    //   check if vehicle number already exists in the database then update the existing vehicle details instead of creating a new one
    const existingVehicle = await Vehicle.findOne({
      owner: new mongoose.Types.ObjectId(user._id),
    });

    if (existingVehicle) {
      existingVehicle.type = type;
      existingVehicle.number = number;
      existingVehicle.vehcleModel = vehcleModel;

      await existingVehicle.save();

      // if partner has rejected reason and updating vehicle details then remove the rejected reason  rabbitMQ
      try {
        await publishEvent("partner.rejected.reason", {
          event: "PARTNER_REJECTED_REASON_REMOVE",
          payload: {
            userId: user._id.toString(),
          },
        });
      } catch (error) {
        console.log("Queue failed but API success", error);
      }

      res.status(200).json({
        message: "Vehicle updated successfully",
        data: { vehicle: existingVehicle },
      });
      return;
    }

    const vehicle = new Vehicle({
      owner: new mongoose.Types.ObjectId(user._id),
      type,
      number,
      status: "pending",
      vehcleModel,
    });

    await vehicle.save();

    // update partner onboarding steps == 1 using rabbitMQ after adding vehicle details
    try {
      await publishEvent("partner.onboarding", {
        event: "PARTNER_ONBOARDING_UPDATED",
        payload: {
          userId: user._id.toString(),
          step: 1,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    res.status(201).json({
      message: "Vehicle added successfully",
      data: { vehicle },
    });
  },
);

export const getVehicleDetails = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const vehicle = await Vehicle.findOne({
      owner: new mongoose.Types.ObjectId(user._id),
    });

    if (!vehicle) {
      res.status(404).json({ message: "Vehicle not found" });
      return;
    }
    res.status(200).json({
      message: "Vehicle details fetched successfully",
      data: { vehicle },
    });
  },
);

export const addDocuments = tryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  if (!files) {
    return res.status(400).json({ message: "No files uploaded." });
  }

  const aadharFile = files.aadharCard?.[0];
  const rcFile = files.rc?.[0];
  const licenseFile = files.license?.[0];

  if (!aadharFile || !rcFile || !licenseFile) {
    return res.status(400).json({
      message: "Please upload all required documents",
    });
  }

  try {
    // 🔥 convert
    const aadharBase64 = generateBase64Image(aadharFile);
    const rcBase64 = generateBase64Image(rcFile);
    const licenseBase64 = generateBase64Image(licenseFile);

    // 🔥 upload once (no duplicate code)
    const response = await axios.post(
      `${process.env.CLOUDINARY_SERVICE_URL}/upload-multiple`,
      {
        files: [aadharBase64, rcBase64, licenseBase64],
      },
      {
        headers: {
          "x-service-secret": process.env.SERVICE_SECRET,
        },
      },
    );

    const [aadhar, rc, license] = response.data.data;

    // 🔥 check existing
    const existingDocs = await PartnerDocs.findOne({
      owner: user._id,
    });

    if (existingDocs) {
      // 🔥 send delete event (non-blocking)
      publishEvent("media.delete", {
        event: "PARTNER_ONBOARDING_DELETE_OLD_DOCS",
        payload: {
          userId: user._id.toString(),
          publicIds: [
            existingDocs.aadharCardUrl.public_id,
            existingDocs.rcUrl.public_id,
            existingDocs.licenseUrl.public_id,
          ],
        },
      }).catch((err) => {
        console.log("Queue failed (ignored)", err);
      });

      // update
      existingDocs.aadharCardUrl = aadhar;
      existingDocs.rcUrl = rc;
      existingDocs.licenseUrl = license;

      await existingDocs.save();

      try {
        await publishEvent("partner.rejected.reason", {
          event: "PARTNER_REJECTED_REASON_REMOVE",
          payload: {
            userId: user._id.toString(),
          },
        });
      } catch (error) {
        console.log("Queue failed but API success", error);
      }

      return res.status(200).json({
        message: "Documents updated successfully ✅",
        data: { partnerDocs: existingDocs },
      });
    }

    // create
    const partnerDocs = await PartnerDocs.create({
      owner: user._id,
      aadharCardUrl: aadhar,
      rcUrl: rc,
      licenseUrl: license,
    });

    try {
      await publishEvent("partner.onboarding", {
        event: "PARTNER_ONBOARDING_UPDATED",
        payload: {
          userId: user._id.toString(),
          step: 2,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return res.status(201).json({
      message: "Documents uploaded successfully 🚀",
      data: { partnerDocs },
    });
  } catch (error) {
    console.error("Upload Error:", error);

    return res.status(500).json({
      message: "Failed to upload documents",
    });
  }
});

export const addBankDetails = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    const {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      upi,
      mobileNumber,
    } = req.body;

    const user = req.user;
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    const mobileRegex = /^[0-9]{10}$/;

    if (!user?._id) {
      return res.status(401).json({
        message: "User Id  not found",
        data: null,
      });
    }

    if (
      !accountHolderName ||
      !accountNumber ||
      !ifscCode ||
      !bankName ||
      !mobileNumber
    ) {
      return res.status(400).json({
        message: "Required All Fields except upi",
        data: null,
      });
    }

    if (!mobileRegex.test(mobileNumber)) {
      return res.status(400).json({
        message: "Mobile Number must be exactly 10 digits",
        data: null,
      });
    }

    if (String(accountNumber).length < 9 || String(accountNumber).length > 18) {
      return res.status(400).json({
        message:
          "Invalid Account Number. It should be between 9 to 18 characters.",
        data: null,
      });
    }

    if (!ifscRegex.test(ifscCode)) {
      res.status(400).json({ message: "Invalid IFSC Code format" });
      return;
    }

    const existingBank = await PartnerBank.findOne({
      owner: user._id,
    });

    const partnerBank = await PartnerBank.findOneAndUpdate(
      {
        owner: user?._id,
      },
      {
        accountHolderName,
        accountNumber,
        ifscCode,
        bankName,
        upi,
        status: "not_added",
      },
      { upsert: true, new: true },
    );

    if (existingBank) {
      try {
        await publishEvent("partner.rejected.reason", {
          event: "PARTNER_REJECTED_REASON_REMOVE",
          payload: {
            userId: user._id.toString(),
          },
        });
      } catch (error) {
        console.log("Queue failed but API success", error);
      }
    }

    try {
      await publishEvent("partner.number.add", {
        event: "USER_NUMBER_ADD",
        payload: {
          mobileNumber,
          userId: user._id.toString(),
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    try {
      await publishEvent("partner.onboarding", {
        event: "PARTNER_ONBOARDING_UPDATED",
        payload: {
          userId: user._id.toString(),
          step: 3,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    const token = jwt.sign(
      {
        user: {
          name: user.name,
          email: user.email,
          _id: user._id,
          role: "partner",
        },
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    res.cookie("token", token, {
      httpOnly: true, // 🔐 JS access nahi kar sakta
      secure: false, // production me true (https)
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: "Partner bank details added successfully",
      data: { partnerBank, token },
    });
  },
);

export const getBankDetails = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    const partnerBank = await PartnerBank.findOne({
      owner: new mongoose.Types.ObjectId(user._id),
    });


    if (!partnerBank) {
      return res.status(404).json({
        success: false,
        message: "Bank details not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bank details fetched successfully",
      data: {
        partnerBank,
      },
    });
  },
);

export const getAdminDetails = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    // fetch auth service data
    const { data } = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/api/v1/user/admin/get-partners`,
      {
        headers: {
          "x-service-secret": process.env.COMMUNICATION_SECRET,
        },
      },
    );

    const {
      totalPartners,
      approvedPartners,
      pendingPartners,
      rejectedPartners,
      reviewPartners,
    } = data.data;

   

    // get ids
    const partnerIds = reviewPartners.map((p: IUser) => p._id);

    // get vehicles
    const vehicles = await Vehicle.find({
      owner: { $in: partnerIds },
    }).select("owner type");

    // make fast lookup object
    const vehicleMap = Object.fromEntries(
      vehicles.map((v) => [String(v.owner), v.type]),
    );

    // merge data
    const pendingPartner = reviewPartners
      .filter((p: IUser) => p.partnerStatus !== "rejected")
      .map((p: IUser) => ({
        _id: p._id,
        name: p.name,
        email: p.email,
        image: p.image,
        vehicleType: vehicleMap[String(p._id)] || "unknown",
      }));

    return res.status(200).json({
      success: true,
      message: "Admin dashboard data fetched",

      data: {
        totalPartners,
        approvedPartners,
        pendingPartners,
        rejectedPartners,
        pendingPartner,
      },
    });
  },
);

export const getPartnerFullDetails = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    // admin check
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID required",
        data: null,
      });
    }

    // AUTH SERVICE CALL

    const authResponse = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/api/v1/user/admin/user-details/${userId}`,
      {
        headers: {
          "x-service-secret": process.env.COMMUNICATION_SECRET,
        },
      },
    );

    const userDetails = authResponse.data.data.user;

    // LOCAL DB DATA

    const [partnerDocs, partnerBank, vehicle] = await Promise.all([
      PartnerDocs.findOne({
        owner: userId,
      }),

      PartnerBank.findOne({
        owner: userId,
      }),

      Vehicle.findOne({
        owner: userId,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Partner full details fetched",

      data: {
        user: userDetails,

        documents: partnerDocs,

        bank: partnerBank,

        vehicle,
      },
    });
  },
);

export const addAndUpdatePartnerPriceDetails = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const vehiclePhoto = req.file;

    const { baseFare, pricePerKM, waitingCharge } = req.body;

   

    if (baseFare == null || pricePerKM == null || waitingCharge == null) {
      return res.status(400).json({
        message: "All fields are required",
        data: null,
        success: false,
      });
    }

    const existingVehicle = await Vehicle.findOne({
      owner: new mongoose.Types.ObjectId(user._id),
    });

    if (!existingVehicle) {
      return res.status(404).json({
        message: "Vehicle not found",
        data: null,
        success: false,
      });
    }

    const oldPublicId = existingVehicle.vehiclePhoto?.public_id;

    existingVehicle.baseFare = Number(baseFare);
    existingVehicle.pricePerKM = Number(pricePerKM);
    existingVehicle.waitingCharge = Number(waitingCharge);

    let uploadedPhoto: any = null;

    if (vehiclePhoto) {
      try {
        const vehicleBase64 = generateBase64Image(vehiclePhoto);

        const response = await axios.post(
          `${process.env.CLOUDINARY_SERVICE_URL}/upload`,
          {
            fileBase64Image: vehicleBase64,
          },
          {
            headers: {
              "x-service-secret": process.env.SERVICE_SECRET,
            },
          },
        );


        uploadedPhoto = response.data;
      } catch (error) {
        console.error("Vehicle photo upload failed:", error);

        return res.status(500).json({
          message: "Failed to upload vehicle photo",
          data: null,
          success: false,
        });
      }
    }

    // only update image if upload happened
    if (uploadedPhoto) {
      if (!uploadedPhoto.public_id) {
        console.log("Invalid upload response:", uploadedPhoto);

        return res.status(500).json({
          message: "Cloudinary response missing public_id",
          success: false,
          data: null,
        });
      }

      existingVehicle.vehiclePhoto = {
        public_id: uploadedPhoto.public_id,

        url: uploadedPhoto.url || uploadedPhoto.secure_url,
      };
    }

    await existingVehicle.save();

    // delete old image after successful save
    if (oldPublicId && uploadedPhoto) {
      try {
        await publishEvent("media.delete", {
          event: "MEDIA_DELETE",

          payload: {
            userId: user._id.toString(),

            publicIds: [oldPublicId],
          },
        });
      } catch (error) {
        console.log("Media delete queue failed:", error);
      }
    }

    try {
      await publishEvent("partner.onboarding", {
        event: "PARTNER_ONBOARDING_UPDATED",
        payload: {
          userId: user._id.toString(),
          step: 6,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return res.status(200).json({
      message: "Partner price details updated successfully",
      data: {
        vehicle: existingVehicle,
      },
      success: true,
    });
  },
);

export const getPendiingVehicleForAdmin = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    // auth service me check karna hoga ki onboarding step 6 complete hai ya nahi taki pending vehicle wale hi dikhe admin ko
    let partnerIds;
    try {
      const { data } = await axios.get(
        `${process.env.AUTH_SERVICE_URL}/api/v1/user/admin/check-partner-onboarding`,
        {
          headers: {
            "x-service-secret": process.env.COMMUNICATION_SECRET,
          },
        },
      );
      partnerIds = data.data.partnerIds;
    } catch (error) {
      console.error("Error fetching pending vehicles:", error);
    }

    const pendingVehicles = await Vehicle.find({
      owner: { $in: partnerIds },
    });


    if (!pendingVehicles.length) {
      return res.status(404).json({
        success: false,
        message: "No pending vehicles found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pending vehicles retrieved successfully",
      data: pendingVehicles,
    });
  },
);

export const handleApproveConfirmationForFinalReview = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    const { vehicleId } = req.params;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID is required",
        data: null,
      });
    }

    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
        data: null,
      });
    }

    vehicle.status = "approved";
    // vehicle.reasonForRejection = "";

    await vehicle.save();

    try {
      await publishEvent("partner.rejected.reason.set", {
        event: "PARTNER_APPROVE_VEHICLE",
        payload: {
          userId: vehicle.owner.toString(),
          reason: "",
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    try {
      await publishEvent("partner.onboarding", {
        event: "PARTNER_ONBOARDING_UPDATED",
        payload: {
          userId: vehicle.owner.toString(),
          step: 7,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    // socket evenet

    try {
      await publishEvent("final-review", {
        event: "FINAL_APPROVED",
        payload: {
          userId: vehicle.owner.toString(),
          status: "approved",
          onboardingStep: 7,
          reason: "",
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle approved successfully",
      data: vehicle,
    });
  },
);

export const handleRejectConfirmationForFinalReview = tryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    const { vehicleId } = req.params;
    const { reason } = req.body;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID is required",
        data: null,
      });
    }

    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
        data: null,
      });
    }

    vehicle.status = "rejected";
    // vehicle.reasonForRejection = reason;

    await vehicle.save();

    try {
      await publishEvent("partner.rejected.reason.set", {
        event: "PARTNER_REJECTED_REASON_SET",
        payload: {
          userId: vehicle.owner.toString(),
          reason: reason,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    try {
      await publishEvent("partner.onboarding", {
        event: "PARTNER_ONBOARDING_UPDATED",
        payload: {
          userId: vehicle.owner.toString(),
          step: 5,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    try {
      await publishEvent("final-review", {
        event: "FINAL_REJECT",
        payload: {
          userId: vehicle.owner.toString(),
          status: "rejected",
          onboardingStep: 5,
          reason,
        },
      });
    } catch (error) {
      console.log("Queue failed but API success", error);
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle rejected successfully",
      data: vehicle,
    });
  },
);

export const findPartnerByVehicleType = tryCatch(async (req, res) => {
  const { vehicleType } = req.body;

  if (!vehicleType) {
    return res.status(400).json({
      success: false,
      message: "vehicleType is required",
      data: null,
    });
  }

  const vehicles = await Vehicle.find({
    type: vehicleType,
    status: "approved",
    // isActive: true,
  })
    .select(
      "_id owner type vehcleModel number baseFare pricePerKM waitingCharge vehiclePhoto",
    )
    .lean();


  const ownerIds = vehicles.map((vehicle) => vehicle.owner.toString());

  return res.status(200).json({
    success: true,
    message: "Vehicles fetched successfully",
    totalVehicles: vehicles.length,
    ownerIds,
    data: vehicles,
  });
});
