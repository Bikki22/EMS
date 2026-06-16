import { Request, Response, NextFunction, RequestHandler } from "express";
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
declare const asyncHandler: (requestHandler: AsyncRequestHandler) => RequestHandler;
export { asyncHandler };
//# sourceMappingURL=AsyncHandler.d.ts.map