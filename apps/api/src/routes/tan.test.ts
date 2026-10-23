import {
  ImageEditorSafetyError,
  ImageEditorTimeoutError,
  type ImageEditInput,
  type ImageEditor,
} from "../services/image-editor/image-editor.js";
import { UnavailableImageEditor } from "../services/image-editor/unavailable-image-editor.js";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00]);

function createMockEditor(edit = vi.fn(async (_input: ImageEditInput) => ({ imageUrl: "https://example.test/tan.jpg" }))): ImageEditor {
  return {
    edit,
    model: "mock-model",
    provider: "mock-provider",
  };
}

describe("POST /api/v1/tan", () => {
  it("returns a job immediately and serves its completed result without another generation", async () => {
    let finish!: (value: { imageUrl: string }) => void;
    const edit = vi.fn((_input: ImageEditInput) => new Promise<{ imageUrl: string }>((resolve) => {
      finish = resolve;
    }));
    const app = createApp({ authorizePaidRequest: (_req, _res, next) => next(), imageEditor: createMockEditor(edit), log: vi.fn() });
    const started = await request(app)
      .post("/api/v1/tan/jobs")
      .field("preset", "golden")
      .attach("image", JPEG, { contentType: "image/jpeg", filename: "photo.jpg" })
      .expect(202);
    const requestId = started.body.requestId as string;

    await request(app).get(`/api/v1/tan/jobs/${requestId}`).expect(202);
    finish({ imageUrl: "https://example.test/tan.jpg" });
    await new Promise<void>((resolve) => setImmediate(resolve));

    const completed = await request(app).get(`/api/v1/tan/jobs/${requestId}`).expect(200);
    expect(completed.body.result.imageUrl).toBe("https://example.test/tan.jpg");
    expect(edit).toHaveBeenCalledTimes(1);
  });

  it("validates input, builds a prompt, and returns the normalized result", async () => {
    const edit = vi.fn(async (_input: ImageEditInput) => ({
      imageUrl: "https://example.test/tan.jpg",
    }));
    const log = vi.fn();
    const app = createApp({ authorizePaidRequest: (_req, _res, next) => next(), imageEditor: createMockEditor(edit), log });

    const response = await request(app)
      .post("/api/v1/tan")
      .field("preset", "golden")
      .attach("image", JPEG, { contentType: "image/jpeg", filename: "photo.jpg" })
      .expect(200);

    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.body).toEqual({
      result: {
        durationMs: expect.any(Number),
        imageUrl: "https://example.test/tan.jpg",
        preset: "golden",
        provider: "mock-provider",
      },
      success: true,
    });
    expect(edit).toHaveBeenCalledOnce();
    expect(edit.mock.calls[0]?.[0]).toMatchObject({
      image: JPEG,
      mimeType: "image/jpeg",
      preset: "golden",
      prompt: expect.stringContaining("warm golden tan"),
      requestId: response.headers["x-request-id"],
    });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "tan_generation_completed",
        model: "mock-model",
        outcome: "success",
        preset: "golden",
        provider: "mock-provider",
        requestId: response.headers["x-request-id"],
      }),
    );
  });

  it("rejects a missing image", async () => {
    const response = await request(createApp({ authorizePaidRequest: (_req, _res, next) => next(), imageEditor: createMockEditor() }))
      .post("/api/v1/tan")
      .field("preset", "golden")
      .expect(400);

    expect(response.body).toEqual({
      error: { code: "IMAGE_REQUIRED", message: "Choose an image to continue." },
      success: false,
    });
  });

  it("rejects an unknown preset", async () => {
    const response = await request(createApp({ authorizePaidRequest: (_req, _res, next) => next(), imageEditor: createMockEditor() }))
      .post("/api/v1/tan")
      .field("preset", "orange")
      .attach("image", JPEG, { contentType: "image/jpeg", filename: "photo.jpg" })
      .expect(400);

    expect(response.body.error.code).toBe("INVALID_PRESET");
  });

  it("rejects unsupported MIME types", async () => {
    const response = await request(createApp({ authorizePaidRequest: (_req, _res, next) => next(), imageEditor: createMockEditor() }))
      .post("/api/v1/tan")
      .field("preset", "golden")
      .attach("image", Buffer.from("gif"), { contentType: "image/gif", filename: "photo.gif" })
      .expect(415);

    expect(response.body.error.code).toBe("UNSUPPORTED_IMAGE_TYPE");
  });

  it("rejects content that does not match its declared image type", async () => {
    const response = await request(createApp({ authorizePaidRequest: (_req, _res, next) => next(), imageEditor: createMockEditor() }))
      .post("/api/v1/tan")
      .field("preset", "golden")
      .attach("image", Buffer.from("not a jpeg"), {
        contentType: "image/jpeg",
        filename: "photo.jpg",
      })
      .expect(400);

    expect(response.body.error.code).toBe("INVALID_IMAGE");
  });

  it("enforces the configured upload limit", async () => {
    const response = await request(
      createApp({ authorizePaidRequest: (_req, _res, next) => next(), imageEditor: createMockEditor(), maxUploadBytes: 4 }),
    )
      .post("/api/v1/tan")
      .field("preset", "golden")
      .attach("image", JPEG, { contentType: "image/jpeg", filename: "photo.jpg" })
      .expect(413);

    expect(response.body.error.code).toBe("IMAGE_TOO_LARGE");
    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("normalizes malformed multipart uploads", async () => {
    const response = await request(createApp({ authorizePaidRequest: (_req, _res, next) => next(), imageEditor: createMockEditor() }))
      .post("/api/v1/tan")
      .field("preset", "golden")
      .attach("wrong-field", JPEG, { contentType: "image/jpeg", filename: "photo.jpg" })
      .expect(400);

    expect(response.body.error.code).toBe("INVALID_IMAGE");
  });

  it("normalizes provider failures without exposing their details", async () => {
    const edit = vi.fn(async (_input: ImageEditInput): Promise<{ imageUrl: string }> => {
      throw new Error("secret provider payload");
    });
    const log = vi.fn();
    const app = createApp({ authorizePaidRequest: (_req, _res, next) => next(), imageEditor: createMockEditor(edit), log });

    const response = await request(app)
      .post("/api/v1/tan")
      .field("preset", "deep")
      .attach("image", JPEG, { contentType: "image/jpeg", filename: "photo.jpg" })
      .expect(502);

    expect(JSON.stringify(response.body)).not.toContain("secret provider payload");
    expect(response.body.error.code).toBe("GENERATION_FAILED");
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "GENERATION_FAILED", outcome: "failure" }),
    );
  });

  it("returns a normalized timeout response", async () => {
    const edit = vi.fn(async (_input: ImageEditInput): Promise<{ imageUrl: string }> => {
      throw new ImageEditorTimeoutError();
    });

    const response = await request(
      createApp({ authorizePaidRequest: (_req, _res, next) => next(), imageEditor: createMockEditor(edit), log: vi.fn() }),
    )
      .post("/api/v1/tan")
      .field("preset", "golden")
      .attach("image", JPEG, { contentType: "image/jpeg", filename: "photo.jpg" })
      .expect(504);

    expect(response.body).toEqual({
      error: {
        code: "GENERATION_TIMEOUT",
        message: "Your tan took too long to create. Please try again.",
      },
      success: false,
    });
  });

  it("returns a useful response for an AI safety rejection", async () => {
    const edit = vi.fn(async (_input: ImageEditInput): Promise<{ imageUrl: string }> => {
      throw new ImageEditorSafetyError();
    });

    const response = await request(
      createApp({ authorizePaidRequest: (_req, _res, next) => next(), imageEditor: createMockEditor(edit), log: vi.fn() }),
    )
      .post("/api/v1/tan")
      .field("preset", "golden")
      .attach("image", JPEG, { contentType: "image/jpeg", filename: "photo.jpg" })
      .expect(422);

    expect(response.body).toEqual({
      error: {
        code: "GENERATION_REJECTED",
        message: "The AI safety system couldn't process this photo. Please choose another photo.",
      },
      success: false,
    });
  });

  it("reports an explicitly unconfigured provider", async () => {
    const response = await request(
      createApp({ authorizePaidRequest: (_req, _res, next) => next(), imageEditor: new UnavailableImageEditor(), log: vi.fn() }),
    )
      .post("/api/v1/tan")
      .field("preset", "natural")
      .attach("image", JPEG, { contentType: "image/jpeg", filename: "photo.jpg" })
      .expect(503);

    expect(response.body.error.code).toBe("SERVICE_UNAVAILABLE");
  });
});
