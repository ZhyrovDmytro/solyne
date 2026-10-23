import { randomUUID } from "node:crypto";

import { Router, type NextFunction, type Request, type Response } from "express";
import type { TanGenerationSuccessResponse, TanPreset } from "@solyne/shared";
import { TAN_PRESETS } from "@solyne/shared";
import multer from "multer";

import { ApplicationError } from "../errors/application-error.js";
import type { GenerateTanInput, TanGenerationService } from "../services/tan-generation.js";
import { TanJobs } from "../services/tan-jobs.js";

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isTanPreset(value: unknown): value is TanPreset {
  return typeof value === "string" && TAN_PRESETS.includes(value as TanPreset);
}

function hasExpectedSignature(image: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  return (
    image.length >= 12 &&
    image.subarray(0, 4).toString("ascii") === "RIFF" &&
    image.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

/** @deprecated Legacy generative comparison route; not part of primary Add Tan. */
export function createTanRouter(
  generationService: TanGenerationService,
  maxUploadBytes: number,
): Router {
  const router = Router();
  const upload = multer({
    limits: { fields: 1, fileSize: maxUploadBytes, files: 1, parts: 3 },
    storage: multer.memoryStorage(),
  });
  const jobs = new TanJobs(generationService);

  function readInput(request: Request, requestId: string): GenerateTanInput {
    if (request.file === undefined) {
      throw new ApplicationError("IMAGE_REQUIRED", "Choose an image to continue.", 400);
    }

    if (!SUPPORTED_IMAGE_TYPES.has(request.file.mimetype)) {
      throw new ApplicationError(
        "UNSUPPORTED_IMAGE_TYPE",
        "Use a JPEG, PNG, or WebP image.",
        415,
      );
    }

    if (request.file.size === 0 || !hasExpectedSignature(request.file.buffer, request.file.mimetype)) {
      throw new ApplicationError("INVALID_IMAGE", "The uploaded image is invalid.", 400);
    }

    const fields = request.body as Record<string, unknown>;
    if (!isTanPreset(fields.preset)) {
      throw new ApplicationError("INVALID_PRESET", "Choose a valid tan preset.", 400);
    }

    return {
      image: request.file.buffer,
      mimeType: request.file.mimetype,
      preset: fields.preset,
      requestId,
    };
  }

  function setRequestId(_request: Request, response: Response, next: NextFunction) {
    response.setHeader("x-request-id", randomUUID());
    next();
  }

  router.post("/tan/jobs", setRequestId, upload.single("image"), (request, response) => {
    const requestId = response.getHeader("x-request-id");
    if (typeof requestId !== "string") {
      throw new Error("Request ID middleware did not run");
    }
    jobs.start(readInput(request, requestId));
    response.status(202).json({ requestId, status: "processing" });
  });

  router.get("/tan/jobs/:requestId", (request, response) => {
    const requestId = request.params.requestId;
    if (typeof requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(requestId)) {
      throw new ApplicationError("JOB_NOT_FOUND", "This edit is no longer available.", 404);
    }
    const job = jobs.get(requestId);
    if (job === undefined) {
      throw new ApplicationError("JOB_NOT_FOUND", "This edit is no longer available.", 404);
    }
    response.setHeader("x-request-id", requestId);
    if (job.status === "processing") {
      response.status(202).json({ requestId, status: "processing" });
    } else if (job.status === "success") {
      response.status(200).json({ result: job.result, success: true } satisfies TanGenerationSuccessResponse);
    } else {
      response.status(job.error.status).json({
        error: { code: job.error.code, message: job.error.message },
        success: false,
      });
    }
  });

  router.post(
    "/tan",
    setRequestId,
    upload.single("image"),
    async (request, response) => {
      const requestIdHeader = response.getHeader("x-request-id");
      if (typeof requestIdHeader !== "string") {
        throw new Error("Request ID middleware did not run");
      }

      const requestId = requestIdHeader;

      const result = await generationService.generate(readInput(request, requestId));
      const body = { result, success: true } satisfies TanGenerationSuccessResponse;

      response.status(200).json(body);
    },
  );

  return router;
}
