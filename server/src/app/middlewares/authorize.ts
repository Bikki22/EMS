import type { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types/express";
import { ApiError } from "../utils/ApiError";

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new ApiError(401, "Unauthorized");
    }

    if (!allowedRoles.includes(authReq.user.roles)) {
      throw new ApiError(
        403,
        "You don't have permission to perform this action",
      );
    }

    next();
  };
};
