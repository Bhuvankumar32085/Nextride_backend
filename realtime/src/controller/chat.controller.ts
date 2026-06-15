import ChatMessage from "../model/chat.model.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import tryCatch from "../utils/tryCatch.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const getChatMessages = tryCatch(async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return sendError(res, "Booking Id is required", null, 400);
  }

  const messages = await ChatMessage.find({
    bookingId,
  })
    .sort({
      createdAt: 1,
    })
    .lean();

  return sendSuccess(res, "Messages fetched successfully", messages);
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const getAiSuggestions = tryCatch(async (req, res) => {
  const { role, messages } = req.body;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = `
You are an AI assistant for a ride booking app.

Generate exactly 5 smart reply suggestions.

Role: ${role}

Recent Messages:
${messages.map((m: any) => `${m.role}: ${m.text}`).join("\n")}

Rules:
- Maximum 8 words each
- Practical ride communication only
- Return ONLY a valid JSON array
- No explanation
- No markdown
- No \`\`\`json
- No extra text

Example:
["I am on the way","Please wait 5 minutes"]
`;

  const result = await model.generateContent(prompt);

  let text = result.response.text();


  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  let suggestions: string[] = [];

  try {
    suggestions = JSON.parse(text);
  } catch (error) {
    console.log("JSON PARSE ERROR", error);

    suggestions = [
      "I am on the way",
      "Please wait",
      "Reaching soon",
      "Call me",
      "Thank you",
    ];
  }

  return sendSuccess(res, "Suggestions generated", suggestions);
});
