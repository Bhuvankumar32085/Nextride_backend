import { Request, Response, NextFunction } from "express";

export const verifyInternalCommunication = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const secret =
    req.headers["x-service-secret"] ||
    req.headers["communication_secret"] ||
    req.headers["service_secret"];

  if (
    !secret ||
    (secret !== process.env.COMMUNICATION_SECRET &&
      secret !== process.env.SERVICE_SECRET)
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized service communication",
      data: null,
    });
  }

  next();
};