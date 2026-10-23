import { Router } from "express";
import type { HealthResponse } from "@solyne/shared";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  const body = {
    status: "ok",
    service: "solyne-api",
  } satisfies HealthResponse;

  response.status(200).json(body);
});
