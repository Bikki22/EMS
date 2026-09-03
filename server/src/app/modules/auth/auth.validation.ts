import { z } from "zod";

// Normalising here keeps signup, login, forgot-password and resend agreeing on
// what "the same address" means, rather than leaning on Mongoose quietly
// applying the schema's lowercase setter to query filters.
const emailField = z.string().trim().toLowerCase().email("Invalid email");

export const signupPayloadModel = z.object({
  firstName: z.string().trim().min(3, "First name must be at least 3 characters"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: emailField,
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().trim().min(10, "Invalid phone number"),
});

export const signinPayloadModel = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordModel = z.object({
  email: emailField,
});

export const resendVerificationModel = z.object({
  email: emailField,
});

export const resetPasswordModel = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const verifyEmailModel = z.object({
  token: z.string().min(1, "Token is required"),
});
