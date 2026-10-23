import { describe, expect, it } from "vitest";

import { InvalidTanResponseError, parseTanGenerationResponse } from "./tan-response";

describe("parseTanGenerationResponse", () => {
  it("accepts a valid provider-independent success response", () => {
    expect(
      parseTanGenerationResponse({
        result: {
          durationMs: 8_421,
          imageUrl: "https://replicate.delivery/result.jpg",
          preset: "golden",
          provider: "replicate",
        },
        success: true,
      }),
    ).toEqual({
      result: {
        durationMs: 8_421,
        imageUrl: "https://replicate.delivery/result.jpg",
        preset: "golden",
        provider: "replicate",
      },
      success: true,
    });
  });

  it("accepts a normalized error response", () => {
    expect(
      parseTanGenerationResponse({
        error: { code: "GENERATION_TIMEOUT", message: "Please try again." },
        success: false,
      }),
    ).toEqual({
      error: { code: "GENERATION_TIMEOUT", message: "Please try again." },
      success: false,
    });
  });

  it("accepts an OpenAI base64 image result", () => {
    const response = {
      result: {
        durationMs: 1_000,
        imageUrl: "data:image/jpeg;base64,/9j/",
        preset: "golden",
        provider: "openai",
      },
      success: true,
    };
    expect(parseTanGenerationResponse(response)).toEqual(response);
  });

  it.each([
    ["non-object data", "html error page"],
    [
      "an insecure result URL",
      {
        result: {
          durationMs: 100,
          imageUrl: "http://example.test/result.jpg",
          preset: "golden",
          provider: "replicate",
        },
        success: true,
      },
    ],
    [
      "an unknown preset",
      {
        result: {
          durationMs: 100,
          imageUrl: "https://example.test/result.jpg",
          preset: "orange",
          provider: "replicate",
        },
        success: true,
      },
    ],
    [
      "a negative duration",
      {
        result: {
          durationMs: -1,
          imageUrl: "https://example.test/result.jpg",
          preset: "golden",
          provider: "replicate",
        },
        success: true,
      },
    ],
    [
      "an unknown error code",
      { error: { code: "RAW_PROVIDER_ERROR", message: "details" }, success: false },
    ],
  ])("rejects %s", (_label, value) => {
    expect(() => parseTanGenerationResponse(value)).toThrow(InvalidTanResponseError);
  });
});
