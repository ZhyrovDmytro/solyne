import type { TanGenerationResult, TanPreset } from "@solyne/shared";

import { ApplicationError } from "../errors/application-error.js";
import { buildTanPrompt } from "../prompts/tan.js";
import {
  ImageEditorSafetyError,
  ImageEditorTimeoutError,
  ImageEditorUnavailableError,
  type ImageEditor,
} from "./image-editor/image-editor.js";

export interface GenerationLog {
  durationMs: number;
  errorCode?: string;
  event: "tan_generation_completed";
  model: string;
  outcome: "success" | "failure";
  preset: TanPreset;
  provider: string;
  requestId: string;
}

export type GenerationLogger = (entry: GenerationLog) => void;

export interface GenerateTanInput {
  image: Buffer;
  mimeType: string;
  preset: TanPreset;
  requestId: string;
}

export class TanGenerationService {
  constructor(
    private readonly imageEditor: ImageEditor,
    private readonly log: GenerationLogger,
  ) {}

  async generate(input: GenerateTanInput): Promise<TanGenerationResult> {
    const startedAt = performance.now();

    try {
      const result = await this.imageEditor.edit({
        ...input,
        prompt: buildTanPrompt(input.preset),
      });
      const durationMs = Math.round(performance.now() - startedAt);

      this.log({
        durationMs,
        event: "tan_generation_completed",
        model: this.imageEditor.model,
        outcome: "success",
        preset: input.preset,
        provider: this.imageEditor.provider,
        requestId: input.requestId,
      });

      return {
        durationMs,
        imageUrl: result.imageUrl,
        preset: input.preset,
        provider: this.imageEditor.provider,
      };
    } catch (error: unknown) {
      const durationMs = Math.round(performance.now() - startedAt);
      const applicationError =
        error instanceof ImageEditorUnavailableError
          ? new ApplicationError(
              "SERVICE_UNAVAILABLE",
              "Image generation is not available yet.",
              503,
            )
          : error instanceof ImageEditorTimeoutError
            ? new ApplicationError(
                "GENERATION_TIMEOUT",
                "Your tan took too long to create. Please try again.",
                504,
              )
            : error instanceof ImageEditorSafetyError
              ? new ApplicationError(
                  "GENERATION_REJECTED",
                  "The AI safety system couldn't process this photo. Please choose another photo.",
                  422,
                )
            : new ApplicationError(
              "GENERATION_FAILED",
              "We couldn't create your tan. Please try again.",
              502,
            );

      this.log({
        durationMs,
        errorCode: applicationError.code,
        event: "tan_generation_completed",
        model: this.imageEditor.model,
        outcome: "failure",
        preset: input.preset,
        provider: this.imageEditor.provider,
        requestId: input.requestId,
      });

      throw applicationError;
    }
  }
}
