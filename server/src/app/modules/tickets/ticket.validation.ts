import { z } from "zod";
import { TICKET_STATUSES } from "./tickets.model";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid id");

export const checkInSchema = z.object({
  qrToken: z.string().min(1, "QR token is required"),
});

export const transferTicketSchema = z.object({
  recipientEmail: z.string().email("Valid recipient email is required"),
});

// Express parses `?status[$ne]=used` into an object, and Mongoose honours
// query operators found in a filter. Casting `req.query.x as string` only hid
// that — these schemas reject anything that isn't a plain expected value.
export const listMyTicketsQuerySchema = z.object({
  eventId: objectId.optional(),
  status: z.enum(TICKET_STATUSES).optional(),
});

export const listEventTicketsQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type TransferTicketInput = z.infer<typeof transferTicketSchema>;
export type ListMyTicketsQuery = z.infer<typeof listMyTicketsQuerySchema>;
export type ListEventTicketsQuery = z.infer<typeof listEventTicketsQuerySchema>;
