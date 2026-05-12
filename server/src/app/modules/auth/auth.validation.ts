import { z } from "zod";

export const signupPayloadModel = z.object({
  firstName: z.string().min(3, "First name must be at least 3 characters"),
  lastName: z.string(),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(7, "Invalid phone number"),
});

export const signinPayloadModel = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordModel = z.object({
  email: z.string().email("Invalid email"),
});

export const resetPasswordModel = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const verifyEmailModel = z.object({
  token: z.string().min(1, "Token is required"),
});
