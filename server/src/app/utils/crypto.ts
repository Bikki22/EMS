import { createHmac, randomBytes } from "node:crypto";

export const generateSalt = (): string => randomBytes(32).toString("hex");

export const hashPassword = (password: string, salt: string): string =>
  createHmac("sha256", salt).update(password).digest("hex");

export const verifyPassword = (
  password: string,
  salt: string,
  storedHash: string,
): boolean => hashPassword(password, salt) === storedHash;
