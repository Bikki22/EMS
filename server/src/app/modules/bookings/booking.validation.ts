import { z } from "zod";

export const createBookingSchema = z.object({
  eventId: z.string().min(1, "Event Id is required"),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().min(1, "Ticket Type Id is requried"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
      }),
    )
    .min(1, "At least one ticket item is requried"),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
