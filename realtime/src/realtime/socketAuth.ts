import { Socket } from "socket.io";

import jwt, { JwtPayload } from "jsonwebtoken";
import { IUser } from "./types.js";

import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthenticatedSocket extends Socket {
  user?: IUser;
}

export const socketAuth = (
  socket: AuthenticatedSocket,

  next: (err?: Error) => void,
) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (!decoded || !decoded.user) {
      return next(new Error("Invalid token"));
    }

    socket.user = decoded.user;

    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
};
