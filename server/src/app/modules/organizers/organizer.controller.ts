import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/AsyncHandler";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { AuthRequest } from "../../types/express";
import { Organizer } from "../events/organizer.model";
import { User } from "../auth/auth.model";
import {
  createOrganizerSchema,
  updateOrganizerSchema,
} from "./organizer.validation";

class OrganizerController {
  // ─── POST /api/v1/organizers ───────────────────────────────
  // Create an organizer profile for the authenticated user and promote them
  // to the org_owner role so they can manage events.
  public createOrganizer: RequestHandler = asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user?._id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const result = await createOrganizerSchema.safeParseAsync(req.body);
    if (!result.success) {
      throw new ApiError(
        400,
        "Validation failed",
        result.error.issues.map((i) => i.message),
      );
    }

    const existing = await Organizer.findOne({ userId });
    if (existing) {
      throw new ApiError(409, "You already have an organizer profile");
    }

    const organizer = await Organizer.create({
      userId,
      name: result.data.name,
      ...(result.data.bio !== undefined ? { bio: result.data.bio } : {}),
      ...(result.data.website !== undefined
        ? { website: result.data.website }
        : {}),
      ...(result.data.logoUrl !== undefined
        ? { logoUrl: result.data.logoUrl }
        : {}),
    });

    // promote to org_owner (unless already an admin)
    await User.updateOne(
      { _id: userId, roles: { $ne: "admin" } },
      { $set: { roles: "org_owner" } },
    );

    res.status(201).json(
      new ApiResponse(
        201,
        { organizer, note: "Log in again to refresh your role permissions." },
        "Organizer profile created",
      ),
    );
  });

  // ─── GET /api/v1/organizers/me ─────────────────────────────
  public getMyOrganizer: RequestHandler = asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user?._id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const organizer = await Organizer.findOne({ userId }).lean();
    if (!organizer) {
      throw new ApiError(404, "You don't have an organizer profile yet");
    }

    res
      .status(200)
      .json(new ApiResponse(200, organizer, "Organizer profile fetched"));
  });

  // ─── PATCH /api/v1/organizers/me ───────────────────────────
  public updateMyOrganizer: RequestHandler = asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user?._id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const result = await updateOrganizerSchema.safeParseAsync(req.body);
    if (!result.success) {
      throw new ApiError(
        400,
        "Validation failed",
        result.error.issues.map((i) => i.message),
      );
    }

    const organizer = await Organizer.findOneAndUpdate(
      { userId },
      { $set: result.data },
      { new: true },
    );

    if (!organizer) {
      throw new ApiError(404, "You don't have an organizer profile yet");
    }

    res
      .status(200)
      .json(new ApiResponse(200, organizer, "Organizer profile updated"));
  });
}

export const organizerController = new OrganizerController();
