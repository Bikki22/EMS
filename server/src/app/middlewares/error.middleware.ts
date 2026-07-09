import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

// Central error handler. Controllers wrapped in asyncHandler forward thrown
// errors here via next(err). Keep this mounted AFTER all routes.
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      data: null,
    });
  }

  // Mongoose duplicate key
  if (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  ) {
    return res.status(409).json({
      success: false,
      message: "Duplicate value violates a unique constraint",
      errors: [],
      data: null,
    });
  }

  // Mongoose validation error
  if (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "ValidationError"
  ) {
    const errors = Object.values(
      (err as { errors: Record<string, { message: string }> }).errors,
    ).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
      data: null,
    });
  }

  const message =
    err instanceof Error ? err.message : "Internal server error";
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  return res.status(500).json({
    success: false,
    message,
    errors: [],
    data: null,
  });
};

// Fallback for unmatched routes.
export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    errors: [],
    data: null,
  });
};
