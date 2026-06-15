import mongoose, { Document } from "mongoose";

export interface IChatMessage extends Document {
  bookingId: string;

  senderId: string;
  receiverId: string;

  role: "user" | "partner";

  text: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const chatMessageSchema = new mongoose.Schema<IChatMessage>(
  {
    bookingId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    senderId: {
      type: String,
      required: true,
      index: true,
    },

    receiverId: {
      type: String,
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "partner"],
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

// Fast booking chat lookup
chatMessageSchema.index({
  bookingId: 1,
  createdAt: 1,
});

const ChatMessage = mongoose.model<IChatMessage>(
  "ChatMessage",
  chatMessageSchema,
);

export default ChatMessage;
