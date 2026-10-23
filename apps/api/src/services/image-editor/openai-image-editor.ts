import { toFile } from "openai";

import type { ImageEditInput, ImageEditResult, ImageEditor } from "./image-editor.js";
import {
  ImageEditorProviderError,
  ImageEditorSafetyError,
  ImageEditorTimeoutError,
} from "./image-editor.js";

interface OpenAIImageEditResponse {
  data?: { b64_json?: string }[];
}

export interface OpenAIImageRunner {
  images: {
    edit(
      body: {
        image: Awaited<ReturnType<typeof toFile>>;
        input_fidelity: "high";
        model: string;
        output_format: "jpeg";
        prompt: string;
        quality: "high";
        size: "auto";
      },
      options: { signal: AbortSignal },
    ): Promise<OpenAIImageEditResponse>;
  };
}

interface OpenAIImageEditorOptions {
  model: string;
  timeoutMs: number;
}

class OpenAITimeoutSentinel extends Error {}

function isSafetyRejection(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("safety") || message.includes("content_policy") || message.includes("moderation");
}

function extensionFor(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export class OpenAIImageEditor implements ImageEditor {
  readonly provider = "openai";
  readonly model: string;

  constructor(
    private readonly client: OpenAIImageRunner,
    private readonly options: OpenAIImageEditorOptions,
  ) {
    this.model = options.model;
  }

  async edit(input: ImageEditInput): Promise<ImageEditResult> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new OpenAITimeoutSentinel());
      }, this.options.timeoutMs);
    });

    try {
      const image = await toFile(
        Uint8Array.from(input.image),
        `source.${extensionFor(input.mimeType)}`,
        { type: input.mimeType },
      );
      const response = await Promise.race([
        this.client.images.edit(
          {
            image,
            input_fidelity: "high",
            model: this.options.model,
            output_format: "jpeg",
            prompt: input.prompt,
            quality: "high",
            size: "auto",
          },
          { signal: controller.signal },
        ),
        timeout,
      ]);
      const base64 = response.data?.[0]?.b64_json;
      if (typeof base64 !== "string" || base64.length === 0) {
        throw new ImageEditorProviderError();
      }
      return { imageUrl: `data:image/jpeg;base64,${base64}` };
    } catch (error: unknown) {
      if (error instanceof OpenAITimeoutSentinel || controller.signal.aborted) {
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
