import { z } from "zod";
declare const ticketTypeSchema: z.ZodObject<{
    _id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodString;
    price: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    totalQuantity: z.ZodNumber;
    maxPerBooking: z.ZodDefault<z.ZodNumber>;
    salesStartAt: z.ZodCoercedDate<unknown>;
    salesEndAt: z.ZodCoercedDate<unknown>;
}, z.core.$strip>;
export declare const createEventSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodString;
    tags: z.ZodArray<z.ZodString>;
    location: z.ZodObject<{
        type: z.ZodEnum<{
            online: "online";
            physical: "physical";
        }>;
        url: z.ZodOptional<z.ZodString>;
        platform: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    startsAt: z.ZodCoercedDate<unknown>;
    endsAt: z.ZodCoercedDate<unknown>;
    ticketTypes: z.ZodArray<z.ZodObject<{
        _id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        description: z.ZodString;
        price: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        totalQuantity: z.ZodNumber;
        maxPerBooking: z.ZodDefault<z.ZodNumber>;
        salesStartAt: z.ZodCoercedDate<unknown>;
        salesEndAt: z.ZodCoercedDate<unknown>;
    }, z.core.$strip>>;
    bannerUrl: z.ZodString;
}, z.core.$strip>;
export declare const updateEventSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    location: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            online: "online";
            physical: "physical";
        }>;
        url: z.ZodOptional<z.ZodString>;
        platform: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    startsAt: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    endsAt: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    ticketTypes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        _id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        description: z.ZodString;
        price: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        totalQuantity: z.ZodNumber;
        maxPerBooking: z.ZodDefault<z.ZodNumber>;
        salesStartAt: z.ZodCoercedDate<unknown>;
        salesEndAt: z.ZodCoercedDate<unknown>;
    }, z.core.$strip>>>;
    bannerUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;
export declare const eventFiltersSchema: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    locationType: z.ZodOptional<z.ZodEnum<{
        online: "online";
        physical: "physical";
    }>>;
    startFrom: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    startTo: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
        cancelled: "cancelled";
    }>>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    sortBy: z.ZodDefault<z.ZodEnum<{
        createdAt: "createdAt";
        title: "title";
        startsAt: "startsAt";
    }>>;
    sortOrder: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
}, z.core.$strip>>;
export declare const publishEventSchema: z.ZodObject<{
    status: z.ZodEnum<{
        draft: "draft";
        published: "published";
        cancelled: "cancelled";
    }>;
}, z.core.$strip>;
export {};
//# sourceMappingURL=event.validation.d.ts.map