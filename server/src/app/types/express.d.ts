import type { Request } from "express";

export interface AuthRequest extends Request {
  // Populated by the `authenticate` middleware. Optional because the type is
  // reached by casting a plain Request, which does not prove the middleware
  // ran — handlers have to check.
  user?: {
    _id: string;
    email: string;
    roles: string;
  };
}
