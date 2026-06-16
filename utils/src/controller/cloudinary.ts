import express from "express";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

router.post("/upload", async (req, res) => {
  try {
    const secret = req.headers["x-service-secret"];

    if (secret !== process.env.SERVICE_SECRET) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { fileBase64Image } = req.body;
    if (!fileBase64Image) {
      res
        .status(400)
        .json({ message: "No image provided in Cloudinary service" });
      return;
    }
    const cloud = await cloudinary.uploader.upload(fileBase64Image, {
      folder: "nextride",
    });
    res.status(200).json({ url: cloud.secure_url, public_id: cloud.public_id });
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    res.status(500).json({ message: "Failed to upload image" });
  }
});

router.delete("/delete", async (req, res) => {
  try {
    const secret = req.headers["x-service-secret"];

    if (secret !== process.env.SERVICE_SECRET) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { publicId } = req.body;
    if (!publicId) {
      res.status(400).json({
        message: "No public_id provided for deletion in Cloudinary service",
      });
      return;
    }
    await cloudinary.uploader.destroy(publicId);
    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    res.status(500).json({ message: "Failed to delete image" });
  }
});

// call example for multiple upload (important for documents)
//  const response = await axios.post(
//       "http://localhost:5003/api/v1/cloudinary/upload-multiple",
//       {
//         files: [aadharBase64, rcBase64, licenseBase64],
//       },
//     );

router.post("/upload-multiple", async (req, res) => {
  try {
    console.log("UPLOAD MULTIPLE HIT");
    const secret = req.headers["x-service-secret"];

    if (secret !== process.env.SERVICE_SECRET) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { files } = req.body; // array of base64 images

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        message: "No images provided",
      });
    }

    // 🔥 Parallel upload (FAST)
    const uploadPromises = files.map((fileBase64Image) => {
      return cloudinary.uploader.upload(fileBase64Image, {
        folder: "nextride",
      });
    });

    const results = await Promise.all(uploadPromises);

    const response = results.map((file) => ({
      url: file.secure_url,
      public_id: file.public_id,
    }));

    return res.status(200).json({
      message: "Files uploaded successfully 🚀",
      data: response,
    });
  } catch (error) {
    console.error("Error uploading images:", error);
    return res.status(500).json({
      message: "Failed to upload images",
    });
  }
});

export default router;
