import jwt from "jsonwebtoken";
import { createHmac, randomBytes } from "node:crypto";
import type { AccessPayload, RefreshPayload } from "../modules/auth/auth.types";

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;
const TOKEN_HASH_SECRET = process.env.TOKEN_HASH_SECRET!;

export const generateJti = () => randomBytes(32).toString("hex");
export const generateFamilyId = () => randomBytes(32).toString("hex");
export const generateOpaqueToken = () => randomBytes(32).toString("hex");

export const hashToken = (token: string): string =>
  createHmac("sha256", TOKEN_HASH_SECRET).update(token).digest("hex");

export const issueAccessToken = (sub: string, email: string): string => {
  const payload: AccessPayload = { sub, email, type: "access" };
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

export const verifyAccessToken = (token: string): AccessPayload =>
  jwt.verify(token, ACCESS_SECRET) as AccessPayload;

export const verifyRefreshToken = (token: string): RefreshPayload =>
  jwt.verify(token, REFRESH_SECRET) as RefreshPayload;
