import { z } from "zod";

export const checkInSchema = z.object({
  qrToken: z.string().min(1, "QR token is required"),
});

export const transferTicketSchema = z.object({
  recipientEmail: z.string().email("Valid recipient email is required"),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type TransferTicketInput = z.infer<typeof transferTicketSchema>;
