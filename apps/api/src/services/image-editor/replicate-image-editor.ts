import type {
  ImageEditInput,
  ImageEditResult,
  ImageEditor,
} from "./image-editor.js";
import {
  ImageEditorProviderError,
  ImageEditorSafetyError,
  ImageEditorTimeoutError,
} from "./image-editor.js";

type ModelIdentifier = `${string}/${string}` | `${string}/${string}:${string}`;

interface ReplicateRunOptions {
  input: {
    aspect_ratio: "match_input_image";
    input_image: Blob;
    output_format: "jpg";
    prompt: string;
    prompt_upsampling: false;
    safety_tolerance: 2;
  };
  signal: AbortSignal;
}

export interface ReplicateRunner {
  run(model: ModelIdentifier, options: ReplicateRunOptions): Promise<unknown>;
}

interface ReplicateImageEditorOptions {
  model: ModelIdentifier;
  timeoutMs: number;
}

class ReplicateTimeoutSentinel extends Error {}

function isSafetyRejection(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("nsfw") || message.includes("safety") || message.includes("flagged");
}

function normalizeOutputUrl(output: unknown): string {
  let value: unknown = output;

  if (output instanceof URL) {
    value = output.toString();
  } else if (
    typeof output === "object" &&
    output !== null &&
    "url" in output &&
    typeof output.url === "function"
  ) {
    value = output.url();
    if (value instanceof URL) {
      value = value.toString();
    }
  }

  if (typeof value !== "string") {
    throw new ImageEditorProviderError();
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new ImageEditorProviderError();
    }
    return url.toString();
  } catch (error: unknown) {
    if (error instanceof ImageEditorProviderError) {
      throw error;
    }
    throw new ImageEditorProviderError();
  }
}

export class ReplicateImageEditor implements ImageEditor {
  readonly provider = "replicate";
  readonly model: string;

  constructor(
    private readonly runner: ReplicateRunner,
    private readonly options: ReplicateImageEditorOptions,
  ) {
    this.model = options.model;
  }

  async edit(input: ImageEditInput): Promise<ImageEditResult> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ReplicateTimeoutSentinel());
      }, this.options.timeoutMs);
    });

    try {
      const output = await Promise.race([
        this.runner.run(this.options.model, {
          input: {
            aspect_ratio: "match_input_image",
            input_image: new Blob([Uint8Array.from(input.image)], { type: input.mimeType }),
            output_format: "jpg",
            prompt: input.prompt,
            prompt_upsampling: false,
            safety_tolerance: 2,
          },
          signal: controller.signal,
        }),
        timeout,
      ]);

      return { imageUrl: normalizeOutputUrl(output) };
    } catch (error: unknown) {
      if (error instanceof ReplicateTimeoutSentinel || controller.signal.aborted) {
        throw new ImageEditorTimeoutError();
      }
      if (isSafetyRejection(error)) {
        throw new ImageEditorSafetyError();
      }
      if (error instanceof ImageEditorProviderError) {
        throw error;
      }
      throw new ImageEditorProviderError();
    } finally {
      clearTimeout(timer);
    }
  }
}
