import type { RequestHandler } from "express";
import mongoose from "mongoose";
import QRCode from "qrcode";
import type { z, ZodTypeAny } from "zod";
import { asyncHandler } from "../../utils/AsyncHandler";
import { AuthRequest } from "../../types/express";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { ticketService, type Caller } from "./ticket.service";
import {
  checkInSchema,
  listEventTicketsQuerySchema,
  listMyTicketsQuerySchema,
  transferTicketSchema,
} from "./ticket.validation";

// Every handler below sits behind `authenticate`, but the type only proves a
// cast, not that the middleware ran — so the caller is resolved explicitly.
const requireCaller = (req: Parameters<RequestHandler>[0]): Caller => {
  const user = (req as AuthRequest).user;
  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }
  return user;
};

const parseOr400 = <T extends ZodTypeAny>(
  schema: T,
  input: unknown,
): z.infer<T> => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(
      400,
      "Validation failed",
      result.error.issues.map((i) => i.message),
    );
  }
  return result.data;
};

class TicketController {
  // ─── GET /api/v1/tickets/:id ───────────────────────────────
  // Get single ticket with QR code image (owner only)

  public getTicket: RequestHandler = asyncHandler(async (req, res) => {
    const caller = requireCaller(req);
    const id = req.params.id as string;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid ticket ID");
    }

    const ticket = await ticketService.getOwnedTicket(id, caller._id);

    const qrCodeDataUrl = await QRCode.toDataURL(ticket.qrToken, {
      errorCorrectionLevel: "H",
      width: 400,
    });

    // The rendered code is the whole point of this endpoint; the raw token is
    // the bearer secret behind it and has no business in the JSON body.
    const { qrToken: _qrToken, ...safeTicket } = ticket;

    res
      .status(200)
      .json(
        new ApiResponse(200, { ...safeTicket, qrCodeDataUrl }, "Ticket fetched"),
      );
  });

  // ─── GET /api/v1/tickets/me ────────────────────────────────
  // List own tickets, optionally filtered by event

  public listMyTickets: RequestHandler = asyncHandler(async (req, res) => {
    const caller = requireCaller(req);
    const query = parseOr400(listMyTicketsQuerySchema, req.query);

    const tickets = await ticketService.listUserTickets(caller._id, query);

    res.status(200).json(new ApiResponse(200, tickets, "Tickets fetched"));
  });

  // ─── POST /api/v1/tickets/check-in ─────────────────────────
  // Org staff scans a QR code and burns the ticket

  public checkInTicket: RequestHandler = asyncHandler(async (req, res) => {
    const caller = requireCaller(req);
    const { qrToken } = parseOr400(checkInSchema, req.body);

    const result = await ticketService.checkIn(qrToken, caller);

    res
      .status(200)
      .json(new ApiResponse(200, result, "Ticket checked in successfully"));
  });

  // ─── GET /api/v1/tickets/event/:eventId/stats ──────────────

  public getEventCheckInStats: RequestHandler = asyncHandler(
    async (req, res) => {
      const caller = requireCaller(req);
      const eventId = req.params.eventId as string;

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        throw new ApiError(400, "Invalid event ID");
      }

      await ticketService.assertEventAccess(eventId, caller);
      const stats = await ticketService.getEventStats(eventId);

      res
        .status(200)
        .json(new ApiResponse(200, stats, "Check-in stats fetched"));
    },
  );

  // ─── GET /api/v1/tickets/event/:eventId ────────────────────

  public listEventTickets: RequestHandler = asyncHandler(async (req, res) => {
    const caller = requireCaller(req);
    const eventId = req.params.eventId as string;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      throw new ApiError(400, "Invalid event ID");
    }

    const { status } = parseOr400(listEventTicketsQuerySchema, req.query);

    // This response carries attendee names and email addresses, so the
    // caller has to actually run this event — the role alone is not enough.
    await ticketService.assertEventAccess(eventId, caller);
    const tickets = await ticketService.listEventTickets(eventId, status);

    res
      .status(200)
      .json(new ApiResponse(200, tickets, "Event tickets fetched"));
  });

  // ─── POST /api/v1/tickets/:id/transfer ─────────────────────

  public transferTicket: RequestHandler = asyncHandler(async (req, res) => {
    const caller = requireCaller(req);
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid ticket ID");
    }

    const { recipientEmail } = parseOr400(transferTicketSchema, req.body);

    const ticket = await ticketService.transfer(id, recipientEmail, caller._id);

    res
      .status(200)
      .json(new ApiResponse(200, ticket, "Ticket transferred successfully"));
  });
}

export const ticketController = new TicketController();
