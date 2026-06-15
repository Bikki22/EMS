import { z } from "zod";
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
        name: z.ZodString;
        description: z.ZodString;
        price: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        totalQuantity: z.ZodNumber;
        salesStartAt: z.ZodCoercedDate<unknown>;
        salesEndAt: z.ZodCoercedDate<unknown>;
    }, z.core.$strip>>;
    bannerUrl: z.ZodString;
}, z.core.$strip>;
export declare const updateEventSchema: z.ZodObject<{
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
        name: z.ZodString;
        description: z.ZodString;
        price: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        totalQuantity: z.ZodNumber;
        salesStartAt: z.ZodCoercedDate<unknown>;
        salesEndAt: z.ZodCoercedDate<unknown>;
    }, z.core.$strip>>;
    bannerUrl: z.ZodString;
}, z.core.$strip>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export declare const eventFiltersSchema: z.ZodObject<{
    category: z.ZodString;
    city: z.ZodString;
    country: z.ZodString;
    locationType: z.ZodEnum<{
        online: "online";
        physical: "physical";
    }>;
    startFrom: z.ZodCoercedDate<unknown>;
    startTo: z.ZodCoercedDate<unknown>;
    search: z.ZodString;
    status: z.ZodEnum<{
        draft: "draft";
        published: "published";
        cancelled: "cancelled";
    }>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    sortBy: z.ZodDefault<z.ZodEnum<{
        title: "title";
        startsAt: "startsAt";
        createdAt: "createdAt";
    }>>;
    sortOrder: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
}, z.core.$strip>;
export declare const publishEventSchema: z.ZodObject<{
    status: z.ZodEnum<{
        published: "published";
        cancelled: "cancelled";
    }>;
}, z.core.$strip>;
//# sourceMappingURL=event.validation.d.ts.map