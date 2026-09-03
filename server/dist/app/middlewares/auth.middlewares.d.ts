import type { Request, Response, NextFunction } from "express";
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Populates `req.user` when a valid token is present and moves on regardless.
 *
 * For endpoints that are public but show more to the right caller — fetching
 * an event by id or slug is public, yet an organizer still needs to preview
 * their own unpublished event through it.
 */
export declare const optionalAuthenticate: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middlewares.d.ts.map