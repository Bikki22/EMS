import jwt from "jsonwebtoken";
import { createHmac, randomBytes } from "node:crypto";
import { env } from "../config/env";
import type { AccessPayload, RefreshPayload } from "../modules/auth/auth.types";

const ACCESS_SECRET = env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = env.REFRESH_TOKEN_SECRET;
const TOKEN_HASH_SECRET = env.TOKEN_HASH_SECRET;

export const generateJti = () => randomBytes(32).toString("hex");
export const generateFamilyId = () => randomBytes(32).toString("hex");
export const generateOpaqueToken = () => randomBytes(32).toString("hex");

export const hashToken = (token: string): string =>
  createHmac("sha256", TOKEN_HASH_SECRET).update(token).digest("hex");

export const issueAccessToken = (
  sub: string,
  email: string,
  roles: string,
): string => {
  const payload: AccessPayload = { sub, email, roles, type: "access" };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
};

export const issueRefreshToken = (
  sub: string,
  familyId: string,
  jti: string,
): string => {
  const payload: RefreshPayload = { sub, familyId, jti, type: "refresh" };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
};

// The separate secrets are what really keep the two token kinds apart, but
// asserting the claim as well means a future refactor that derives one secret
// from the other doesn't silently make an access token a valid refresh token.
export const verifyAccessToken = (token: string): AccessPayload => {
  const payload = jwt.verify(token, ACCESS_SECRET) as AccessPayload;
  if (payload.type !== "access") {
    throw new Error("Expected an access token");
  }
  return payload;
};

export const verifyRefreshToken = (token: string): RefreshPayload => {
  const payload = jwt.verify(token, REFRESH_SECRET) as RefreshPayload;
  if (payload.type !== "refresh") {
    throw new Error("Expected a refresh token");
  }
  return payload;
};
