import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ImageEditorProviderError,
  ImageEditorSafetyError,
  ImageEditorTimeoutError,
  type ImageEditInput,
} from "./image-editor.js";
import {
  ReplicateImageEditor,
  type ReplicateRunner,
} from "./replicate-image-editor.js";

const INPUT: ImageEditInput = {
  image: Buffer.from([0xff, 0xd8, 0xff]),
  mimeType: "image/jpeg",
  preset: "golden",
  prompt: "Apply a golden tan",
  requestId: "request-id",
};

function createEditor(run: ReplicateRunner["run"], timeoutMs = 1_000) {
  return new ReplicateImageEditor({ run }, {
    model: "black-forest-labs/flux-kontext-pro",
    timeoutMs,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ReplicateImageEditor", () => {
  it("maps the domain input to FLUX Kontext Pro and returns its URL", async () => {
    const run = vi.fn<ReplicateRunner["run"]>(async () =>
      "https://replicate.delivery/output.jpg"
    );
    const editor = createEditor(run);

    await expect(editor.edit(INPUT)).resolves.toEqual({
      imageUrl: "https://replicate.delivery/output.jpg",
    });

    expect(run).toHaveBeenCalledOnce();
    const [model, options] = run.mock.calls[0] ?? [];
    expect(model).toBe("black-forest-labs/flux-kontext-pro");
    expect(options?.input).toMatchObject({
      aspect_ratio: "match_input_image",
      output_format: "jpg",
      prompt: INPUT.prompt,
      prompt_upsampling: false,
      safety_tolerance: 2,
    });
    expect(options?.input.input_image).toBeInstanceOf(Blob);
    expect(options?.input.input_image.type).toBe("image/jpeg");
    expect(options?.input.input_image.size).toBe(INPUT.image.length);
  });

  it("accepts the SDK FileOutput URL shape", async () => {
    const run = vi.fn<ReplicateRunner["run"]>(async () => ({
      url: () => new URL("https://replicate.delivery/file-output.jpg"),
    }));

    await expect(createEditor(run).edit(INPUT)).resolves.toEqual({
      imageUrl: "https://replicate.delivery/file-output.jpg",
    });
  });

  it.each([
    ["an invalid output", { unexpected: true }],
    ["an insecure URL", "http://replicate.delivery/output.jpg"],
  ])("normalizes %s", async (_label, output) => {
    const run = vi.fn<ReplicateRunner["run"]>(async () => output);

    await expect(createEditor(run).edit(INPUT)).rejects.toBeInstanceOf(
      ImageEditorProviderError,
    );
  });

  it("normalizes provider errors without retaining raw details", async () => {
    const run = vi.fn<ReplicateRunner["run"]>(async () => {
      throw new Error("raw provider payload and token");
    });

    await expect(createEditor(run).edit(INPUT)).rejects.toEqual(
      new ImageEditorProviderError(),
    );
  });

  it("classifies provider safety rejections without retaining raw details", async () => {
    const run = vi.fn<ReplicateRunner["run"]>(async () => {
      throw new Error("Prediction failed: NSFW content detected in private provider payload");
    });

    await expect(createEditor(run).edit(INPUT)).rejects.toEqual(
      new ImageEditorSafetyError(),
    );
  });

  it("aborts and returns a typed timeout error", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const run = vi.fn<ReplicateRunner["run"]>((_model, options) => {
      signal = options.signal;
      return new Promise<never>(() => undefined);
    });
    const result = createEditor(run, 500).edit(INPUT);
    const expectation = expect(result).rejects.toBeInstanceOf(ImageEditorTimeoutError);

    await vi.advanceTimersByTimeAsync(500);

    await expectation;
    expect(signal?.aborted).toBe(true);
  });
});
