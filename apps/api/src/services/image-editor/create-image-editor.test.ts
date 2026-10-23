import { describe, expect, it } from "vitest";

import { readEnv } from "../../config/env.js";
import { createImageEditor } from "./create-image-editor.js";
import { KlingImageEditor } from "./kling-image-editor.js";
import { OpenAIImageEditor } from "./openai-image-editor.js";
import { UnavailableImageEditor } from "./unavailable-image-editor.js";

describe("createImageEditor", () => {
  it("uses OpenAI by default when its API key is configured", () => {
    expect(createImageEditor(readEnv({ OPENAI_API_KEY: "test-key" }))).toBeInstanceOf(
      OpenAIImageEditor,
    );
  });

  it("is explicitly unavailable when the default OpenAI key is missing", () => {
    expect(createImageEditor(readEnv({}))).toBeInstanceOf(UnavailableImageEditor);
  });

  it("keeps the legacy Kling provider selectable", () => {
    expect(createImageEditor(readEnv({ IMAGE_PROVIDER: "kling" }))).toBeInstanceOf(
      KlingImageEditor,
    );
  });

  it("keeps Replicate optional and unavailable without its token", () => {
    expect(createImageEditor(readEnv({ IMAGE_PROVIDER: "replicate" }))).toBeInstanceOf(
      UnavailableImageEditor,
    );
  });
});
