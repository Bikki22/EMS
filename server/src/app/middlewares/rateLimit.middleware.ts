import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  /**
   * Extra key material folded in alongside the caller's IP — e.g. the
   * submitted email, so a per-account ceiling can sit next to a per-IP one.
   */
  key?: (req: Request) => string | undefined;
}

/**
 * Fixed-window counter kept in this process's memory. Dependency-free, in
 * keeping with the hand-rolled cors/cookie middlewares.
 *
 * Two deployment caveats:
 *  - Each instance counts on its own, so behind a load balancer the effective
 *    limit is `max * instances`. Move to a shared store (Redis) if the API is
 *    ever scaled out.
 *  - Keys off `req.ip`, which is the proxy's address unless Express is told to
 *    trust the proxy. Set `app.set("trust proxy", <hops>)` when deploying
 *    behind one, or every caller shares a single bucket.
 */
export const rateLimit = ({
  windowMs,
  max,
  message = "Too many requests. Please try again later.",
  key,
}: RateLimitOptions) => {
  const buckets = new Map<string, Bucket>();
  let lastSweep = Date.now();

  // Drop expired buckets at most once per window so the map can't grow without
  // bound as addresses churn.
  const sweep = (now: number) => {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [id, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(id);
    }
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    sweep(now);

    const identity = `${req.ip ?? "unknown"}|${key?.(req) ?? ""}`;
    const bucket = buckets.get(identity);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(identity, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;

    if (bucket.count > max) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((bucket.resetAt - now) / 1000)),
      );
      return res.status(429).json({ message });
    }

    next();
  };
};

/** Keys a limiter by the email in the request body, so one abusive caller
 *  can't lock every account out of an endpoint at once. */
export const byBodyEmail = (req: Request): string =>
  String((req.body as { email?: unknown } | undefined)?.email ?? "")
    .trim()
    .toLowerCase();
