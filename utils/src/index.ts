import express from "express";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import cors from "cors";
import cloudinaryRouter from "./controller/cloudinary.js";
import { startOnboardingConsumer } from "./consumer/onboarding.consumer.js";
dotenv.config();

console.log("FRONTEND_URL =", process.env.FRONTEND_URL);

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // frontend URL
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const { CLOUDINARTY_CLOUD_NAME, CLOUDINARTY_API_KEY, CLOUDINARTY_API_SECRET } =
  process.env;

if (
  !CLOUDINARTY_CLOUD_NAME ||
  !CLOUDINARTY_API_KEY ||
  !CLOUDINARTY_API_SECRET
) {
  console.error(
    "Cloudinary configuration is missing. Please set CLOUDINARTY_CLOUD_NAME, CLOUDINARTY_API_KEY, and CLOUDINARTY_API_SECRET in your environment variables.",
  );
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARTY_CLOUD_NAME,
  api_key: CLOUDINARTY_API_KEY,
  api_secret: CLOUDINARTY_API_SECRET,
});

const PORT = process.env.PORT || 5003;

startOnboardingConsumer();

app.get("/api/v1/cloudinary/health", (_, res) => {
  res.status(200).json({
    success: true,
    message: "Utils service awake",
  });
});

app.use("/api/v1/cloudinary", cloudinaryRouter);

app.listen(PORT, () => {
  console.log(`Utils service is running on port ${PORT}`);
});

// check ci cd test 1 commit
