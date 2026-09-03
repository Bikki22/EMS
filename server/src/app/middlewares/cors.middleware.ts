import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

/**
 * Dependency-free CORS so the Next.js client (a different origin in dev)
 * can call the API with credentials. Mirrors the subset of the `cors`
 * package this project actually needs.
 */
const DEFAULT_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

const buildAllowedOrigins = (): string[] => {
  const configured = (env.CORS_ORIGINS || env.CLIENT_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

  // In production the allowlist is exactly what was configured. Folding the
  // localhost defaults in as well would make any app running on the user's own
  // machine a trusted origin that can read credentialed responses.
  if (env.NODE_ENV === "production") return configured;

  return Array.from(new Set([...configured, ...DEFAULT_ORIGINS]));
};

const ALLOWED_ORIGINS = buildAllowedOrigins();

if (env.NODE_ENV === "production" && ALLOWED_ORIGINS.length === 0) {
  console.warn(
    "⚠️  No CORS_ORIGINS or CLIENT_URL configured — every cross-origin browser request will be blocked.",
  );
}

export const cors = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  // Credentialed requests cannot use a wildcard — echo the caller's origin.
  if (origin && ALLOWED_ORIGINS.includes(origin.replace(/\/$/, ""))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,X-Requested-With",
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  // Short-circuit preflight before it reaches any route.
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
};
