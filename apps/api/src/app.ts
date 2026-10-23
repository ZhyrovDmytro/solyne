import express from "express";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { createTanRouter } from "./routes/tan.js";
import { createImageEditor } from "./services/image-editor/create-image-editor.js";
import type { ImageEditor } from "./services/image-editor/image-editor.js";
import { TanGenerationService, type GenerationLogger } from "./services/tan-generation.js";

interface AppDependencies {
  imageEditor?: ImageEditor;
  log?: GenerationLogger;
  maxUploadBytes?: number;
  /** Server-owned authorization middleware; must authenticate, check payment and job ownership. */
  authorizePaidRequest?: import("express").RequestHandler;
}

const defaultLogger: GenerationLogger = (entry) => {
  console.info(JSON.stringify(entry));
};

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  const generationService = new TanGenerationService(
    dependencies.imageEditor ?? createImageEditor(env),
    dependencies.log ?? defaultLogger,
  );

  app.disable("x-powered-by");
  app.use("/api/v1", healthRouter);
  app.use("/api/v1/tan", dependencies.authorizePaidRequest ?? ((_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.status(503).json({ success: false, error: { code: "BILLING_UNAVAILABLE", message: "Paid editing is not available yet." } });
  }));
  app.use(
    "/api/v1",
    createTanRouter(generationService, dependencies.maxUploadBytes ?? env.maxUploadBytes),
  );
  app.use(errorHandler);

  return app;
}

export const app = createApp();
