import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/AsyncHandler";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { AuthRequest } from "../../types/express";
import { organizerService } from "./organizer.service";
import {
  createOrganizerSchema,
  updateOrganizerSchema,
} from "./organizer.validation";

const requireUserId = (req: Parameters<RequestHandler>[0]): string => {
  const userId = (req as AuthRequest).user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }
  return userId;
};

class OrganizerController {
  // ─── POST /api/v1/organizers ───────────────────────────────
  // Create an organizer profile for the authenticated user and promote them
  // to the org_owner role so they can manage events.
  public createOrganizer: RequestHandler = asyncHandler(async (req, res) => {
    const userId = requireUserId(req);

    const result = await createOrganizerSchema.safeParseAsync(req.body);
    if (!result.success) {
      throw new ApiError(
        400,
        "Validation failed",
        result.error.issues.map((i) => i.message),
      );
    }

    const organizer = await organizerService.create(userId, result.data);

    res.status(201).json(
      new ApiResponse(
        201,
        {
          organizer,
          // The role lives in the 15-minute access token, so the current one
          // still says "user". Hitting /auth/refresh re-reads the role from
          // the database and mints a token with it — no re-login needed.
          note: "Call /auth/refresh to pick up your new organizer permissions.",
        },
        "Organizer profile created",
      ),
    );
  });

  // ─── GET /api/v1/organizers/me ─────────────────────────────
  public getMyOrganizer: RequestHandler = asyncHandler(async (req, res) => {
    const userId = requireUserId(req);

    const organizer = await organizerService.getByUserId(userId);
    if (!organizer) {
      throw new ApiError(404, "You don't have an organizer profile yet");
    }

    res
      .status(200)
      .json(new ApiResponse(200, organizer, "Organizer profile fetched"));
  });

  // ─── PATCH /api/v1/organizers/me ───────────────────────────
  public updateMyOrganizer: RequestHandler = asyncHandler(async (req, res) => {
    const userId = requireUserId(req);

    const result = await updateOrganizerSchema.safeParseAsync(req.body);
    if (!result.success) {
      throw new ApiError(
        400,
        "Validation failed",
        result.error.issues.map((i) => i.message),
      );
    }

    const organizer = await organizerService.updateByUserId(
      userId,
      result.data,
    );

    res
      .status(200)
      .json(new ApiResponse(200, organizer, "Organizer profile updated"));
  });
}

export const organizerController = new OrganizerController();
