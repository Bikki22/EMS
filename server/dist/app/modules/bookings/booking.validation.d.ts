import { z } from "zod";
export declare const createBookingSchema: z.ZodObject<{
    eventId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        ticketTypeId: z.ZodString;
        quantity: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const cancelBookingSchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
//# sourceMappingURL=booking.validation.d.ts.map