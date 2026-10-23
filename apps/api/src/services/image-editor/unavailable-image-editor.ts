import {
  ImageEditorUnavailableError,
  type ImageEditInput,
  type ImageEditResult,
  type ImageEditor,
} from "./image-editor.js";

export class UnavailableImageEditor implements ImageEditor {
  readonly model = "unconfigured";
  readonly provider = "unconfigured";

  async edit(_input: ImageEditInput): Promise<ImageEditResult> {
    throw new ImageEditorUnavailableError();
  }
}
