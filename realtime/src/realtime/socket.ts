import { Server } from "socket.io";
import { socketAuth } from "./socketAuth.js";

let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",

      credentials: true,
    },
  });

  // authentication middleware ye app.use jasa h yaha socketAuth ek function h jo middleware ki tarha work karra h
  // mene es fun me frontend se token lekar verify karke socket.user me user ki info store karri h taki baad me use kr ske
  io.use(socketAuth);

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }

  return io;
};
