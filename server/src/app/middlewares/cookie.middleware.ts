import type { Request, Response, NextFunction } from "express";

// Minimal cookie parser — avoids pulling in an external dependency.
// Populates req.cookies from the Cookie request header.
export const cookieParser = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.headers.cookie;
  const cookies: Record<string, string> = {};

  if (header) {
    for (const part of header.split(";")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key) cookies[key] = decodeURIComponent(value);
    }
  }

  req.cookies = cookies;
  next();
};
