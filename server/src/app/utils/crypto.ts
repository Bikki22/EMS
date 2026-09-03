import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";

// bcrypt cost factor: slow enough that an offline attack on a leaked dump is
// expensive, fast enough for an interactive login.
const BCRYPT_COST = 12;

// Accounts created before the move to bcrypt store a single round of
// HMAC-SHA256 keyed by a per-user salt in `User.salt`. A bcrypt hash is
// self-describing, so the stored value tells us which scheme produced it and
// no migration flag is needed.
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;

export const isLegacyPasswordHash = (storedHash: string): boolean =>
  !BCRYPT_HASH.test(storedHash);

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, BCRYPT_COST);

const legacyHash = (password: string, salt: string): string =>
  createHmac("sha256", salt).update(password).digest("hex");

const constantTimeEquals = (a: string, b: string): boolean => {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

export const verifyPassword = async (
  password: string,
  storedHash: string,
  salt?: string | undefined,
): Promise<boolean> => {
  if (isLegacyPasswordHash(storedHash)) {
    if (!salt) return false;
    return constantTimeEquals(legacyHash(password, salt), storedHash);
  }
  return bcrypt.compare(password, storedHash);
};
