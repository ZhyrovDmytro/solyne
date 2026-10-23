import { requirePaidAccess } from "./billing";
import type { TanErrorCode, TanGenerationResult, TanPreset } from "@solyne/shared";
import { fetch } from "expo/fetch";
import { File } from "expo-file-system";

import { env } from "../config/env";
import type { OriginalPhoto } from "../state/tan-session";
import {
  InvalidTanResponseError,
  parseTanGenerationResponse,
} from "./tan-response";

const MOBILE_REQUEST_TIMEOUT_MS = 225_000;

export type MobileGenerationErrorCode =
  | TanErrorCode
  | "INVALID_RESPONSE"
  | "LOCAL_IMAGE_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "REQUEST_TIMEOUT";

export class TanGenerationRequestError extends Error {
  readonly code: MobileGenerationErrorCode;
  readonly requestId?: string;

  constructor(code: MobileGenerationErrorCode, message: string, requestId?: string) {
    super(message);
    this.name = "TanGenerationRequestError";
    this.code = code;
    this.requestId = requestId;
  }
}

export interface GenerateTanInput {
  originalPhoto: OriginalPhoto;
  preset: TanPreset;
}

function tanEndpoint(): string {
  return `${env.apiUrl.replace(/\/$/, "")}/api/v1/tan/jobs`;
}

function parseJobId(value: unknown): string {
  if (
    typeof value !== "object" || value === null ||
    !("status" in value) || value.status !== "processing" ||
    !("requestId" in value) || typeof value.requestId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(value.requestId)
  ) {
    throw new InvalidTanResponseError();
  }
  return value.requestId;
}

function completedResult(value: unknown, requestId?: string): TanGenerationResult {
  const body = parseTanGenerationResponse(value);
  if (!body.success) {
    throw new TanGenerationRequestError(body.error.code, body.error.message, requestId);
  }
  return body.result;
}

/**
 * @deprecated Legacy cloud-generation comparison path. The active Add Tan
 * architecture must use the local mask pipeline after its benchmark gate.
 */
export async function requestTanGeneration({
  originalPhoto,
  preset,
}: GenerateTanInput): Promise<TanGenerationResult> {
  requirePaidAccess();
  const image = new File(originalPhoto.uri);
  if (!image.exists) {
    throw new TanGenerationRequestError(
      "LOCAL_IMAGE_UNAVAILABLE",
      "The original photo is no longer available. Please choose it again.",
    );
  }

  const formData = new FormData();
  formData.append("image", image, originalPhoto.fileName);
  formData.append("preset", preset);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MOBILE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(tanEndpoint(), {
      body: formData,
      method: "POST",
      signal: controller.signal,
    });
    const initialValue: unknown = await response.json();
    if (response.status !== 202) {
      return completedResult(initialValue, response.headers.get("x-request-id") ?? undefined);
    }
    const requestId = parseJobId(initialValue);

    while (true) {
      await new Promise<void>((resolve) => setTimeout(resolve, 2_500));
      const pollResponse = await fetch(`${tanEndpoint()}/${requestId}`, {
        method: "GET",
        signal: controller.signal,
      });
      const pollValue: unknown = await pollResponse.json();
      if (pollResponse.status !== 202) {
        return completedResult(pollValue, requestId);
      }
      parseJobId(pollValue);
    }
  } catch (error: unknown) {
    if (error instanceof TanGenerationRequestError) {
      throw error;
    }
    if (controller.signal.aborted) {
      throw new TanGenerationRequestError(
        "REQUEST_TIMEOUT",
        "The request took too long. Please try again.",
      );
    }
    if (error instanceof InvalidTanResponseError) {
      throw new TanGenerationRequestError(
        "INVALID_RESPONSE",
        "Solyne received an invalid response. Please try again.",
      );
    }
    throw new TanGenerationRequestError(
      "NETWORK_ERROR",
      "Solyne couldn't reach the editing service. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
