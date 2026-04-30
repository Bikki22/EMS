import express, { type Express, type Request, type Response } from "express";
import { ApiResponse } from "./utils/ApiResponse";
import { env } from "./config/env";

export const createApplication = (): Express => {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          status: "ok",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          env: env?.NODE_ENV,
        },
        "Service healthy",
      ),
    );
  });

  return app;
};
