import { ApiError } from "../../utils/ApiError";
import { User } from "../auth/auth.model";
import { Organizer } from "./organizer.model";
import type {
  CreateOrganizerInput,
  UpdateOrganizerInput,
} from "./organizer.validation";

export class OrganizerService {
  public async getByUserId(userId: string) {
    return Organizer.findOne({ userId }).lean();
  }

  /**
   * Create the caller's organizer profile and promote them to org_owner.
   *
   * The unique index on `userId` is what actually prevents a second profile —
   * two concurrent requests both clear the `findOne` below, and the loser
   * surfaces as a Mongo 11000, which the error middleware maps to a 409.
   */
  public async create(userId: string, data: CreateOrganizerInput) {
    const existing = await Organizer.findOne({ userId }).select("_id").lean();
    if (existing) {
      throw new ApiError(409, "You already have an organizer profile");
    }

    const organizer = await Organizer.create({
      userId,
      name: data.name,
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
      ...(data.website !== undefined ? { website: data.website } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
    });

    // Admins keep the broader role.
    await User.updateOne(
      { _id: userId, roles: { $ne: "admin" } },
      { $set: { roles: "org_owner" } },
    );

    return organizer;
  }

  public async updateByUserId(userId: string, data: UpdateOrganizerInput) {
    const organizer = await Organizer.findOneAndUpdate(
      { userId },
      { $set: data },
      { returnDocument: "after", runValidators: true },
    );

    if (!organizer) {
      throw new ApiError(404, "You don't have an organizer profile yet");
    }

    return organizer;
  }
}

export const organizerService = new OrganizerService();
