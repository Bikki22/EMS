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
    /**
     * `includeUnpublished` is opt-in and only set by the organizer-scoped
     * listing. The public browse endpoint must never surface drafts, so a
     * caller-supplied `status` filter is ignored there.
     */
    getEvents(filters: EventFilters, opts?: {
        includeUnpublished?: boolean;
    }): Promise<{
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
    /**
     * A draft or cancelled event is only visible to the organizer that owns it.
     * `viewerOrganizerId` is the viewing user's organizer profile when they have
     * one; everyone else sees published events only.
     */
    private isVisibleTo;
    getEventById(eventId: string, viewerOrganizerId?: string): Promise<(import("./event.model").IEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    getEventBySlug(slug: string, viewerOrganizerId?: string): Promise<(import("./event.model").IEvent & Required<{
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
    /**
     * Fold an incoming ticket-type array into the stored one.
     *
     * Rebuilding the array from the request wholesale used to reset
     * `quantitySold` to 0 and mint fresh subdocument _ids, which both oversold
     * the event and orphaned every existing booking's `ticketTypeId`. Entries
     * carrying an `_id` are therefore matched to the stored ticket type and keep
     * its identity and sold count; only genuinely new entries start empty.
     */
    private mergeTicketTypes;
    /** Bookings that still hold seats on this event. */
    private countLiveBookings;
    updateEventStatus(eventId: string, organizerId: string, status: "draft" | "published" | "cancelled"): Promise<(import("mongoose").Document<unknown, {}, import("./event.model").IEvent, {}, import("mongoose").DefaultSchemaOptions> & import("./event.model").IEvent & Required<{
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