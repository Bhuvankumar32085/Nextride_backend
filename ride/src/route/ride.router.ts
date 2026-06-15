import express from "express";
import {
  addBankDetails,
  addDocuments,
  addVehicleAndUpdate,
  getAdminDetails,
  getBankDetails,
  getVehicleDetails,
  getPartnerFullDetails,
  addAndUpdatePartnerPriceDetails,
  getPendiingVehicleForAdmin,
  handleApproveConfirmationForFinalReview,
  handleRejectConfirmationForFinalReview,
  findPartnerByVehicleType,
} from "../controller/ride.controller.js";
import { isAuth } from "../middlewares/isAuth.js";
import upload from "../middlewares/muilter.js";

const router = express.Router();

router.post("/add-edit-vehicle", isAuth, addVehicleAndUpdate);
router.get("/vehicle-details", isAuth, getVehicleDetails);
router.post(
  "/add-documents",
  isAuth,
  upload.fields([
    { name: "aadharCard", maxCount: 1 },
    { name: "rc", maxCount: 1 },
    { name: "license", maxCount: 1 },
  ]),
  addDocuments,
);
router.post("/add-bank-details", isAuth, addBankDetails);
router.post(
  "/admin/approve-vehicle/:vehicleId",
  isAuth,
  handleApproveConfirmationForFinalReview,
);
router.post(
  "/admin/reject-vehicle/:vehicleId",
  isAuth,
  handleRejectConfirmationForFinalReview,
);
router.get("/bank-details", isAuth, getBankDetails);
router.get("/admin-deshboard--details", isAuth, getAdminDetails);
router.get("/admin/pending-vehicles", isAuth, getPendiingVehicleForAdmin);
router.post("/get-vehicle-by-vehicle-type", findPartnerByVehicleType);
router.get(
  "/admin/partner-full-details/:userId",
  isAuth,
  getPartnerFullDetails,
);
router.post(
  "/add-edit-partner-price-details",
  isAuth,
  upload.single("vehiclePhoto"),
  addAndUpdatePartnerPriceDetails,
);

export default router;
