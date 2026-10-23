import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ImageEditorProviderError,
  ImageEditorSafetyError,
  ImageEditorTimeoutError,
  type ImageEditInput,
} from "./image-editor.js";
import { OpenAIImageEditor, type OpenAIImageRunner } from "./openai-image-editor.js";

const INPUT: ImageEditInput = {
  image: Buffer.from([0xff, 0xd8, 0xff]),
  mimeType: "image/jpeg",
  preset: "golden",
  prompt: "Apply a golden tan only to exposed skin",
  requestId: "request-id",
};

function createEditor(edit: OpenAIImageRunner["images"]["edit"], timeoutMs = 1_000) {
  return new OpenAIImageEditor({ images: { edit } }, {
    model: "gpt-image-2.5-sunburst",
    timeoutMs,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("OpenAIImageEditor", () => {
  it("sends a high-fidelity edit and returns a JPEG data URL", async () => {
    const edit = vi.fn<OpenAIImageRunner["images"]["edit"]>(async () => ({
      data: [{ b64_json: "/9j/" }],
    }));

    await expect(createEditor(edit).edit(INPUT)).resolves.toEqual({
      imageUrl: "data:image/jpeg;base64,/9j/",
    });
    expect(edit).toHaveBeenCalledOnce();
    const [body, options] = edit.mock.calls[0] ?? [];
    expect(body).toMatchObject({
      input_fidelity: "high",
      model: "gpt-image-2.5-sunburst",
      output_format: "jpeg",
      prompt: INPUT.prompt,
      quality: "high",
      size: "auto",
    });
    expect(body?.image).toBeInstanceOf(File);
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects an empty provider response", async () => {
    const edit = vi.fn<OpenAIImageRunner["images"]["edit"]>(async () => ({ data: [] }));
    await expect(createEditor(edit).edit(INPUT)).rejects.toBeInstanceOf(ImageEditorProviderError);
  });

  it("normalizes safety errors", async () => {
    const edit = vi.fn<OpenAIImageRunner["images"]["edit"]>(async () => {
      throw new Error("content_policy violation with private provider details");
    });
    await expect(createEditor(edit).edit(INPUT)).rejects.toEqual(new ImageEditorSafetyError());
  });

  it("aborts and returns a typed timeout", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const edit = vi.fn<OpenAIImageRunner["images"]["edit"]>((_body, options) => {
      signal = options.signal;
      return new Promise<never>(() => undefined);
    });
    const result = createEditor(edit, 500).edit(INPUT);
    const expectation = expect(result).rejects.toBeInstanceOf(ImageEditorTimeoutError);
    await vi.advanceTimersByTimeAsync(500);
    await expectation;
    expect(signal?.aborted).toBe(true);
  });
});
