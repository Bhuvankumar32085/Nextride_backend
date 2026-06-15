import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: "user" | "partner" | "admin";
  image?: string;
  mobileNumber?: string;
  partnerStatus?: "pending" | "approved" | "rejected";
  partnerOnboardingSteps?: number;
  createdAt?: Date;
}

// name email mobileNumber image partnerStatus partnerOnboardingSteps createdAt

export interface AuthenticatedRequest extends Request {
  user?: IUser | null;
}

export const isAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Please Login - Header missing",
      });
      return;
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({
        message: "Please Login - Token missing",
      });
      return;
    }
    const decodeToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as JwtPayload;

    if (!decodeToken || !decodeToken.user) {
      res.status(401).json({
        message: "Invalid Token",
      });
      return;
    }
    req.user = decodeToken.user;
    next();
  } catch (error) {
    res.status(500).json({
      message: "Please Login",
    });
  }
};
