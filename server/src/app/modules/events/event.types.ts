import { AuthRequest } from "../../types/express";

export interface EventLocation {
  type: "online" | "physical";
  url?: string | undefined;
  platform?: string | undefined;
  address?: string | undefined;
  city?: string | undefined;
  country?: string | undefined;
}

export interface TicketType {
  name: string;
  description?: string;
  price: number;
  currency: string;
  totalQuantity: number;
  salesStartAt: Date;
  salesEndAt: Date;
}

export interface CreateEventData {
  title: string;
  description: string;
  category: string;
  tags?: string[] | undefined;
  location: EventLocation;
  startsAt: Date;
  endsAt: Date;
  ticketTypes: TicketType[];
  bannerUrl?: string | undefined;
}

export interface UpdateEventData extends Partial<CreateEventData> {}

export interface EventFilters {
  category?: string | undefined;
  city?: string | undefined;
  country?: string | undefined;
  locationType?: "online" | "physical" | undefined;
  startFrom?: Date | undefined;
  startTo?: Date | undefined;
  search?: string | undefined;
  status?: "draft" | "published" | "cancelled" | undefined;
  organizerId?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: "startsAt" | "createdAt" | "title" | undefined;
  sortOrder?: "asc" | "desc" | undefined;
}

export interface OrganizerRequest extends AuthRequest {
  organizer: {
    _id: string;
    userId: string;
  };
}
