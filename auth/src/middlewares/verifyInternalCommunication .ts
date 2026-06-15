import { Request, Response, NextFunction } from "express";

export const verifyInternalCommunication = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const secret = req.headers["communication_secret"];

  if (
    !secret ||
    secret !== process.env.COMMUNICATION_SECRET
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized service communication",
      data: null,
    });
  }

  next();
};