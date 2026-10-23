import { access } from "node:fs/promises";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ImageEditorProviderError,
  ImageEditorSafetyError,
  ImageEditorUnavailableError,
  type ImageEditInput,
} from "./image-editor.js";
import { KlingImageEditor, type KlingRunner } from "./kling-image-editor.js";

const input: ImageEditInput = {
  image: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  mimeType: "image/jpeg",
  preset: "golden",
  prompt: "Apply a natural golden tan.",
  requestId: "test-request",
};

function editor(run: KlingRunner) {
  return new KlingImageEditor({ model: "kling-image-v3_0_omni", timeoutMs: 210_000 }, run);
}

describe("KlingImageEditor", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the original through the local CLI and removes the temporary file", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    let imagePath = "";
    const run = vi.fn<KlingRunner>(async (args, timeoutMs) => {
      if (args[0] === "image_to_image") {
        expect(args.slice(0, 3)).toEqual(["image_to_image", "--model", "kling-image-v3_0_omni"]);
        expect(args).toContain("auto");
        expect(args.at(-1)).toContain("图片1");
        expect(timeoutMs).toBe(210_000);
        imagePath = args[args.indexOf("--image") + 1] ?? "";
        await expect(access(imagePath)).resolves.toBeUndefined();
        return { ok: true, body: { generationId: "test-generation", creditsConsumed: 2 } };
      }
      expect(args).toEqual(["query_tasks", "test-generation", "--poll", "180"]);
      return { ok: true, body: { polled: true, timedOut: false, generations: [{ generationId: "test-generation", status: "COMPLETED", result: { status: "COMPLETED", works: [{ urlWithoutWatermark: "https://example.test/result.jpg" }] } }] } };
    });

    await expect(editor(run).edit(input)).resolves.toEqual({
      imageUrl: "https://example.test/result.jpg",
    });
    await expect(access(imagePath)).rejects.toThrow();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed results and hides provider details", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    await expect(editor(async (args) => args[0] === "image_to_image"
      ? { body: { generationId: "test-generation" } }
      : { ok: true, body: { polled: true, timedOut: false, generations: [{ status: "COMPLETED", result: { works: [] } }] } }).edit(input)).rejects.toBeInstanceOf(
      ImageEditorProviderError,
    );
    await expect(editor(async () => {
      throw new Error("raw secret provider payload");
    }).edit(input)).rejects.toEqual(new ImageEditorProviderError());
  });

  it("classifies login and safety failures", async () => {
    await expect(editor(async () => {
      throw new Error("Not logged in");
    }).edit(input)).rejects.toBeInstanceOf(ImageEditorUnavailableError);
    await expect(editor(async () => {
      throw new Error("NSFW content rejected");
    }).edit(input)).rejects.toBeInstanceOf(ImageEditorSafetyError);
  });

  it("classifies a failed polled generation without losing its task ID", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const run = vi.fn<KlingRunner>(async (args) => args[0] === "image_to_image"
      ? { ok: true, body: { generationId: "test-generation" } }
      : { ok: false, body: { polled: true, timedOut: false, generations: [{ generationId: "test-generation", status: "FAILED", result: { message: "NSFW content detected" } }] } });
    await expect(editor(run).edit(input)).rejects.toBeInstanceOf(ImageEditorSafetyError);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
