import express from "express";
import {
  addmobileNumber,
  checkPartnerOnboardingStatusIS6,
  findTotalPartner,
  getCurrentUser,
  getFinderById,
  getPartnerWithIn5_Km,
  getPendingVideoKycPartners,
  getUserByIdInternal,
  getUserDetailsForAdmin,
  googleLogin,
  handlePartnerVideoKysReApply,
  handleVideoKycResult,
  login,
  logout,
  partnerReview,
  register,
  startVideoKyc,
  verifyEmailAfterOtpIsValid,
} from "../controller/user.controller.js";
import { isAuth } from "../middlewares/isAuth.js";
import { verifyInternalCommunication } from "../middlewares/verifyInternalCommunication .js";
const router = express.Router();

router.post("/register", register);
router.post("/google-login", googleLogin);
router.post("/login", login);
router.post("/verify-email", verifyEmailAfterOtpIsValid);
router.get("/current-user", getCurrentUser);
router.get("/admin/get-partners", findTotalPartner);
router.post("/logout", logout);
router.post("/admin/partner-review/:partnerId", isAuth, partnerReview);
router.patch("/admin/video-kyc/start", isAuth, startVideoKyc);
router.get("/admin/user-details/:userId", getUserDetailsForAdmin);
router.get("/admin/pending-video-kyc", isAuth, getPendingVideoKycPartners);
router.get("/admin/check-partner-onboarding", checkPartnerOnboardingStatusIS6);
router.post("/admin/video-kyc/result", isAuth, handleVideoKycResult);
router.post("/admin/video-kyc/re-apply", isAuth, handlePartnerVideoKysReApply);
router.post("/get-partnet-with-in-5km", isAuth, getPartnerWithIn5_Km);
router.post("/add-user-mobileNumber", isAuth, addmobileNumber);
router.get(
  "/find/:finderRole/:finderId",
  verifyInternalCommunication,
  getFinderById,
);
router.get(
  "/internal/user/:userId",
  verifyInternalCommunication,
  getUserByIdInternal,
);

export default router;
