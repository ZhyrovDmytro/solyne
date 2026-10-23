export const TAN_PRESETS = ["natural", "golden", "bronze", "deep"] as const;

export type TanPreset = (typeof TAN_PRESETS)[number];

export const TAN_ERROR_CODES = [
  "IMAGE_REQUIRED",
  "IMAGE_TOO_LARGE",
  "INVALID_IMAGE",
  "INVALID_PRESET",
  "UNSUPPORTED_IMAGE_TYPE",
  "GENERATION_FAILED",
  "GENERATION_REJECTED",
  "GENERATION_TIMEOUT",
  "SERVICE_UNAVAILABLE",
  "JOB_NOT_FOUND",
  "INTERNAL_ERROR",
] as const;

export type TanErrorCode = (typeof TAN_ERROR_CODES)[number];

export interface TanGenerationResult {
  durationMs: number;
  imageUrl: string;
  preset: TanPreset;
  provider: string;
}

export interface TanGenerationSuccessResponse {
  result: TanGenerationResult;
  success: true;
}

export interface TanGenerationErrorResponse {
  error: {
    code: TanErrorCode;
    message: string;
  };
  success: false;
}

export type TanGenerationResponse =
  | TanGenerationSuccessResponse
  | TanGenerationErrorResponse;
