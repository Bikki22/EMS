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
  category?: string;
  city?: string;
  country?: string;
  locationType?: "online" | "physical";
  startFrom?: Date;
  startTo?: Date;
  search?: string;
  status?: "draft" | "published" | "cancelled";
  organizerId?: string;
  page?: number;
  limit?: number;
  sortBy?: "startsAt" | "createdAt" | "title";
  sortOrder?: "asc" | "desc";
}

export interface OrganizerRequest extends AuthRequest {
  organizer: {
    _id: string;
    userId: string;
  };
}
