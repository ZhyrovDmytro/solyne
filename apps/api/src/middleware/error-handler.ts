import type { ErrorRequestHandler } from "express";
import type { TanGenerationErrorResponse } from "@solyne/shared";
import multer from "multer";

import { ApplicationError } from "../errors/application-error.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  let applicationError: ApplicationError;

  if (error instanceof ApplicationError) {
    applicationError = error;
  } else if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    applicationError = new ApplicationError(
      "IMAGE_TOO_LARGE",
      "The image is too large. Choose an image under the upload limit.",
      413,
    );
  } else if (error instanceof multer.MulterError) {
    applicationError = new ApplicationError(
      "INVALID_IMAGE",
      "The image upload is invalid.",
      400,
    );
  } else {
    applicationError = new ApplicationError(
      "INTERNAL_ERROR",
      "Something went wrong. Please try again.",
      500,
    );
  }

  const body = {
    error: {
      code: applicationError.code,
      message: applicationError.message,
    },
    success: false,
  } satisfies TanGenerationErrorResponse;

  response.status(applicationError.status).json(body);
};
