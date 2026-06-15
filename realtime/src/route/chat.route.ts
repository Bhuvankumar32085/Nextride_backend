import express from "express";
import {
  getAiSuggestions,
  getChatMessages,
} from "../controller/chat.controller.js";

const router = express.Router();

router.get("/messages/:bookingId", getChatMessages);
router.post("/chat/ai-suggestions", getAiSuggestions);

export default router;
