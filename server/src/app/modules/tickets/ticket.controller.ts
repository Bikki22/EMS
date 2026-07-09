import type { RequestHandler, Response } from "express";
import mongoose from "mongoose";
import { User } from "../auth/auth.model";
import { asyncHandler } from "../../utils/AsyncHandler";
import { AuthRequest } from "../../types/express";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { Ticket } from "./tickets.model";
import QRCode from "qrcode";
import { checkInSchema, transferTicketSchema } from "./ticket.validation";

class TicketController {
  // ─── GET /api/tickets/:id ──────────────────────────────────
  // Get single ticket with QR code image (owner only)

  public getTicket: RequestHandler = asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const userId = (req as AuthRequest).user?._id.toString();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid ticket ID");
    }

    const ticket = await Ticket.findById(id)
      .select("+qrToken")
      .populate("event", "title slug startsAt endsAt location bannerUrl")
      .lean();

    if (!ticket) {
      throw new ApiError(404, "Ticket not found");
    }

    if (ticket.user.toString() !== userId) {
      throw new ApiError(403, "You don't have access to this ticket");
    }

    // generate QR code image as base64 data URL
    const qrCodeDataUrl = await QRCode.toDataURL(ticket.qrToken, {
      errorCorrectionLevel: "H",
      width: 400,
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, { ...ticket, qrCodeDataUrl }, "Ticket fetched"),
      );
  });

  // ─── GET /api/tickets/me ───────────────────────────────────
  // List own tickets, optionally filtered by event

  public listMyTickets: RequestHandler = asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user?._id.toString();
    const eventId = req.query.eventId as string | undefined;
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = { user: userId };
    if (eventId) filter.event = eventId;
    if (status) filter.status = status;

    const tickets = await Ticket.find(filter)
      .populate("event", "title slug startsAt bannerUrl location")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(new ApiResponse(200, tickets, "Tickets fetched"));
  });

  // ─── POST /api/tickets/:id/check-in ────────────────────────
  // Org staff scans QR and checks a ticket in

  public checkInTicket: RequestHandler = asyncHandler(async (req, res) => {
    const result = checkInSchema.safeParse(req.body);
    if (!result.success) {
      throw new ApiError(
        400,
        "Validation failed",
        result.error.issues.map((i) => i.message),
      );
    }

    const { qrToken } = result.data;
    const staffId = (req as AuthRequest).user?._id.toString();

    // find ticket by QR token (select+ since it's hidden by default)
    const ticket = await Ticket.findOne({ qrToken })
      .select("+qrToken")
      .populate("event");

    if (!ticket) {
      throw new ApiError(404, "Invalid QR code — ticket not found");
    }

    const event = ticket.event as any;

    if (ticket.status === "cancelled") {
      throw new ApiError(400, "This ticket has been cancelled");
    }

    if (ticket.status === "used") {
      throw new ApiError(
        409,
        `Ticket already checked in at ${ticket.checkedInAt?.toLocaleString()}`,
      );
    }

    if (ticket.status === "transferred") {
      throw new ApiError(
        400,
        "This ticket has been transferred to another user",
      );
    }

    // verify event is happening today (within reasonable window)
    const now = new Date();
    const eventStart = new Date(event.startsAt);
    const eventEnd = new Date(event.endsAt);
    const bufferMs = 2 * 60 * 60 * 1000; // 2hr buffer before/after

    if (now < new Date(eventStart.getTime() - bufferMs)) {
      throw new ApiError(400, "Check-in hasn't opened yet for this event");
    }
    if (now > new Date(eventEnd.getTime() + bufferMs)) {
      throw new ApiError(400, "This event has already ended");
    }

    ticket.status = "used";
    ticket.checkedInAt = new Date();
    ticket.checkedInBy = new mongoose.Types.ObjectId(staffId);
    await ticket.save();

    res.status(200).json(
      new ApiResponse(
        200,
        {
          ticketId: ticket._id,
          ticketName: ticket.ticketName,
          checkedInAt: ticket.checkedInAt,
          eventTitle: event.title,
        },
        "Ticket checked in successfully",
      ),
    );
  });

  public getEventCheckInStats: RequestHandler = asyncHandler(
    async (req, res) => {
      const eventId = req.params.eventId as string;

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        throw new ApiError(400, "Invalid event ID");
      }

      const [total, checkedIn, cancelled] = await Promise.all([
        Ticket.countDocuments({ event: eventId }),
        Ticket.countDocuments({ event: eventId, status: "used" }),
        Ticket.countDocuments({ event: eventId, status: "cancelled" }),
      ]);

      res.status(200).json(
        new ApiResponse(
          200,
          {
            total,
            checkedIn,
            remaining: total - checkedIn - cancelled,
            cancelled,
            checkInRate: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
          },
          "Check-in stats fetched",
        ),
      );
    },
  );

  public listEventTickets: RequestHandler = asyncHandler(async (req, res) => {
    const eventId = req.params.eventId as string;
    const status = req.query.status as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      throw new ApiError(400, "Invalid event ID");
    }

    const filter: Record<string, unknown> = { event: eventId };
    if (status) filter.status = status;

    const tickets = await Ticket.find(filter)
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();

    res
      .status(200)
      .json(new ApiResponse(200, tickets, "Event tickets fetched"));
  });

  public transferTicket: RequestHandler = asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const userId = (req as AuthRequest).user?._id.toString();

    const result = transferTicketSchema.safeParse(req.body);
    if (!result.success) {
      throw new ApiError(
        400,
        "Validation failed",
        result.error.issues.map((i) => i.message),
      );
    }

    const { recipientEmail } = result.data;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid ticket ID");
    }

    const ticket = await Ticket.findById(id).populate("event");
    if (!ticket) {
      throw new ApiError(404, "Ticket not found");
    }

    if (ticket.user.toString() !== userId) {
      throw new ApiError(403, "You can only transfer your own tickets");
    }

    if (ticket.status !== "active") {
      throw new ApiError(
        400,
        `Cannot transfer a ticket with status "${ticket.status}"`,
      );
    }

    const event = ticket.event as any;
    if (new Date(event.startsAt) <= new Date()) {
      throw new ApiError(
        400,
        "Cannot transfer tickets after the event has started",
      );
    }

    const recipient = await User.findOne({
      email: recipientEmail.toLowerCase(),
    });
    if (!recipient) {
      throw new ApiError(404, "Recipient is not registered on the platform");
    }

    if (recipient._id.toString() === userId) {
      throw new ApiError(400, "You cannot transfer a ticket to yourself");
    }

    const previousOwner = ticket.user;

    ticket.user = recipient._id;
    ticket.transferredTo = recipient._id;
    ticket.transferredAt = new Date();
    await ticket.save();

    res
      .status(200)
      .json(new ApiResponse(200, ticket, "Ticket transferred successfully"));
  });
}

export const ticketController = new TicketController();
