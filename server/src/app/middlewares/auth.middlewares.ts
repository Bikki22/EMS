import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/token";
import { AuthRequest } from "../types/express";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Malformed token" });
  }

  try {
    const payload = verifyAccessToken(token);
    (req as AuthRequest).user = { _id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
