import type { Response, NextFunction } from "express";
import { AuthRequest } from "../types/express";
import { OrganizerRequest } from "../modules/events/event.types";
import { Organizer } from "../modules/events/organizer.model";

// ensures the authenticated user has an organizer profile
export const requireOrganizer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const organizer = await Organizer.findOne({ userId: req.user._id });

  if (!organizer) {
    return res.status(403).json({
      message: "You must have an organizer profile to perform this action",
    });
  }

  (req as OrganizerRequest).organizer = {
    _id: organizer._id.toString(),
    userId: organizer.userId.toString(),
  };

  next();
};
