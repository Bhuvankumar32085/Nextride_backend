import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./route/notification.route.js";
import { connectDB } from "./config/db.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/notification", userRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Notification service is running on port ${PORT}`);
  });
});
