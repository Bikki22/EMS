import type { CreateEventData, EventFilters } from "./event.types";
import { UpdateEventInput } from "./event.validation";
export declare class EventService {
    getOrganizerByUserId(userId: string): Promise<(import("mongoose").Document<unknown, {}, import("./organizer.model").IOrganizer, {}, import("mongoose").DefaultSchemaOptions> & import("./organizer.model").IOrganizer & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    createEvent(organizerId: string, data: CreateEventData): Promise<import("mongoose").Document<unknown, {}, import("./event.model").IEvent, {}, import("mongoose").DefaultSchemaOptions> & import("./event.model").IEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    getEvents(filters: EventFilters): Promise<{
        events: (import("./event.model").IEvent & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getEventById(eventId: string): Promise<(import("./event.model").IEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    getEventBySlug(slug: string): Promise<(import("./event.model").IEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    updateEvent(eventId: string, organizerId: string, data: UpdateEventInput): Promise<(import("mongoose").Document<unknown, {}, import("./event.model").IEvent, {}, import("mongoose").DefaultSchemaOptions> & import("./event.model").IEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    updateEventStatus(eventId: string, organizerId: string, status: "published" | "cancelled"): Promise<(import("mongoose").Document<unknown, {}, import("./event.model").IEvent, {}, import("mongoose").DefaultSchemaOptions> & import("./event.model").IEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    deleteEvent(eventId: string, organizerId: string): Promise<true | null>;
    getMyEvents(organizerId: string, page: number, limit: number): Promise<{
        events: (import("./event.model").IEvent & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
}
//# sourceMappingURL=event.services.d.ts.map