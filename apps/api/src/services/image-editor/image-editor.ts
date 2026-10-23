import type { TanPreset } from "@solyne/shared";

export interface ImageEditInput {
  image: Buffer;
  mimeType: string;
  preset: TanPreset;
  prompt: string;
  requestId: string;
}

export interface ImageEditResult {
  imageUrl: string;
}

export interface ImageEditor {
  readonly model: string;
  readonly provider: string;
  edit(input: ImageEditInput): Promise<ImageEditResult>;
}

export class ImageEditorUnavailableError extends Error {
  constructor() {
    super("No image editor is configured");
    this.name = "ImageEditorUnavailableError";
  }
}

export class ImageEditorTimeoutError extends Error {
  constructor() {
    super("Image provider request timed out");
    this.name = "ImageEditorTimeoutError";
  }
}

export class ImageEditorProviderError extends Error {
  constructor() {
    super("Image provider request failed");
    this.name = "ImageEditorProviderError";
  }
}

export class ImageEditorSafetyError extends Error {
  constructor() {
    super("Image provider safety check rejected the request");
    this.name = "ImageEditorSafetyError";
  }
}
