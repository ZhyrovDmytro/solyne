import Replicate from "replicate";
import OpenAI from "openai";

import type { env } from "../../config/env.js";
import type { ImageEditor } from "./image-editor.js";
import { ReplicateImageEditor } from "./replicate-image-editor.js";
import { KlingImageEditor } from "./kling-image-editor.js";
import { OpenAIImageEditor } from "./openai-image-editor.js";
import { UnavailableImageEditor } from "./unavailable-image-editor.js";

type ImageEditorConfig = Pick<
  typeof env,
  | "imageProvider"
  | "klingModel"
  | "klingTimeoutMs"
  | "openaiApiKey"
  | "openaiModel"
  | "openaiTimeoutMs"
  | "replicateApiToken"
  | "replicateModel"
  | "replicateTimeoutMs"
>;

export function createImageEditor(config: ImageEditorConfig): ImageEditor {
  if (config.imageProvider === "openai") {
    if (config.openaiApiKey === undefined) {
      return new UnavailableImageEditor();
    }

    return new OpenAIImageEditor(
      new OpenAI({ apiKey: config.openaiApiKey }),
      { model: config.openaiModel, timeoutMs: config.openaiTimeoutMs },
    );
  }

  if (config.imageProvider === "kling") {
    return new KlingImageEditor({
      model: config.klingModel,
      timeoutMs: config.klingTimeoutMs,
    });
  }

  if (config.replicateApiToken === undefined) {
    return new UnavailableImageEditor();
  }

  const client = new Replicate({
    auth: config.replicateApiToken,
    useFileOutput: false,
    userAgent: "solyne-api/0.1.0",
  });

  return new ReplicateImageEditor(client, {
    model: config.replicateModel,
    timeoutMs: config.replicateTimeoutMs,
  });
}
