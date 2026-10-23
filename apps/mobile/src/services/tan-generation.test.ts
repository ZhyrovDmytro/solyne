import { afterEach, describe, expect, it, vi } from "vitest";
import { fetch } from "expo/fetch";

import { requestTanGeneration } from "./tan-generation";

vi.mock("expo/fetch", () => ({ fetch: vi.fn() }));
vi.mock("expo-file-system", () => ({
  File: class extends Blob {
    exists = true;

    constructor() {
      super(["test image"], { type: "image/jpeg" });
    }
  },
}));
vi.mock("../config/env", () => ({ env: { apiUrl: "http://127.0.0.1:3000" } }));

const requestId = "22c8f38f-5e21-491e-bdb1-4cf772f029d4";

function response(status: number, body: unknown): Awaited<ReturnType<typeof fetch>> {
  return {
    headers: new Headers({ "x-request-id": requestId }),
    json: async () => body,
    status,
  } as unknown as Awaited<ReturnType<typeof fetch>>;
}

describe("requestTanGeneration", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("collects a completed edit through short job polls", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(202, { requestId, status: "processing" }))
      .mockResolvedValueOnce(response(202, { requestId, status: "processing" }))
      .mockResolvedValueOnce(response(200, {
        result: {
          durationMs: 95_000,
          imageUrl: "https://example.test/tan.png",
          preset: "golden",
          provider: "kling",
        },
        success: true,
      }));

    const result = requestTanGeneration({
      originalPhoto: {
        fileName: "original.jpg",
        height: 100,
        mimeType: "image/jpeg",
        source: "library",
        uri: "file:///original.jpg",
        width: 100,
      },
      preset: "golden",
    });
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(result).resolves.toMatchObject({
      imageUrl: "https://example.test/tan.png",
      provider: "kling",
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe(
      `http://127.0.0.1:3000/api/v1/tan/jobs/${requestId}`,
    );
  });
});

vi.mock("./billing", () => ({ requirePaidAccess: vi.fn() }));
