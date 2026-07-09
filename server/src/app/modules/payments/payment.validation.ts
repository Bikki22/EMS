import { z } from "zod";

export const initiatePaymentSchema = z.object({
  bookingId: z.string().min(1, "bookingId is required"),
  provider: z.enum(["khalti", "esewa"]),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
