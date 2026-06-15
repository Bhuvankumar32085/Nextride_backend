import { getIO } from "../socket.js";

export const emitToUser = (userId: string, event: string, data: any) => {
  const io = getIO();

  io.to(userId).emit(event, data);
};
