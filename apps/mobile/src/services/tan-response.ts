import {
  TAN_ERROR_CODES,
  TAN_PRESETS,
  type TanErrorCode,
  type TanGenerationResponse,
  type TanGenerationResult,
  type TanPreset,
} from "@solyne/shared";

export class InvalidTanResponseError extends Error {
  constructor() {
    super("The server returned an invalid response");
    this.name = "InvalidTanResponseError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTanPreset(value: unknown): value is TanPreset {
  return typeof value === "string" && TAN_PRESETS.includes(value as TanPreset);
}

function isTanErrorCode(value: unknown): value is TanErrorCode {
  return typeof value === "string" && TAN_ERROR_CODES.includes(value as TanErrorCode);
}

function isSupportedImageReference(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)) {
    return true;
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parseResult(value: unknown): TanGenerationResult {
  if (
    !isRecord(value) ||
    !isSupportedImageReference(value.imageUrl) ||
    !isTanPreset(value.preset) ||
    typeof value.provider !== "string" ||
    value.provider.length === 0 ||
    typeof value.durationMs !== "number" ||
    !Number.isFinite(value.durationMs) ||
    value.durationMs < 0
  ) {
    throw new InvalidTanResponseError();
  }

  return {
    durationMs: value.durationMs,
    imageUrl: value.imageUrl,
    preset: value.preset,
    provider: value.provider,
  };
}

export function parseTanGenerationResponse(value: unknown): TanGenerationResponse {
  if (!isRecord(value)) {
    throw new InvalidTanResponseError();
  }

  if (value.success === true) {
    return { result: parseResult(value.result), success: true };
  }

  if (
    value.success === false &&
    isRecord(value.error) &&
    isTanErrorCode(value.error.code) &&
    typeof value.error.message === "string" &&
    value.error.message.length > 0
  ) {
    return {
      error: { code: value.error.code, message: value.error.message },
      success: false,
    };
  }

  throw new InvalidTanResponseError();
}
