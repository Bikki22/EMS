import express, { type Express, type Request, type Response } from "express";
import { ApiResponse } from "./utils/ApiResponse";
import { env } from "./config/env";
import { cookieParser } from "./middlewares/cookie.middleware";
import { cors } from "./middlewares/cors.middleware";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import authRouter from "./modules/auth/auth.route";
import eventRoutes from "./modules/events/event.routes";
import organizerRoutes from "./modules/organizers/organizer.route";
import bookingRoutes from "./modules/bookings/booking.routes";
import ticketRoutes from "./modules/tickets/ticket.routes";
import paymentRoutes from "./modules/payments/payment.route";

export const createApplication = (): Express => {
  const app = express();

  // Must run before any route so preflight requests are answered.
  app.use(cors);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); // for provider form callbacks
  app.use(cookieParser);

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          status: "ok",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          env: env.NODE_ENV,
        },
        "Service healthy",
      ),
    );
  });

  app.use("/auth", authRouter);
  app.use("/api/v1/events", eventRoutes);
  app.use("/api/v1/organizers", organizerRoutes);
  app.use("/api/v1/bookings", bookingRoutes);
  app.use("/api/v1/tickets", ticketRoutes);
  app.use("/api/v1/payments", paymentRoutes);

  // 404 + centralized error handling (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
