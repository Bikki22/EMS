import type { Response, NextFunction } from "express";
import { AuthRequest } from "../types/express";
export declare const requireOrganizer: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=event.middlewares.d.ts.map