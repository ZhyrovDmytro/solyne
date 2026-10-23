import { describe, expect, it } from "vitest";

import { readEnv } from "./env.js";

describe("readEnv", () => {
  it("refuses the local Kling sign-in in production", () => {
    expect(() => readEnv({ NODE_ENV: "production", IMAGE_PROVIDER: "kling" })).toThrow(
      "local POC only",
    );
  });
  it("uses OpenAI as the default without requiring a provider token at startup", () => {
    expect(readEnv({})).toEqual({
      imageProvider: "openai",
      openaiApiKey: undefined,
      openaiModel: "gpt-image-2.5-sunburst",
      openaiTimeoutMs: 180_000,
      klingModel: "kling-image-v3_0_omni",
      klingTimeoutMs: 210_000,
      maxUploadBytes: 15 * 1024 * 1024,
      port: 3000,
      replicateApiToken: undefined,
      replicateModel: "black-forest-labs/flux-kontext-pro",
      replicateTimeoutMs: 120_000,
    });
  });

  it("reads provider configuration and trims secrets", () => {
    expect(
      readEnv({
        IMAGE_PROVIDER: "replicate",
        KLING_MODEL: "kling-image-o1",
        KLING_TIMEOUT_MS: "180000",
        MAX_UPLOAD_MB: "10",
        PORT: "4000",
        OPENAI_API_KEY: "  openai-token  ",
        OPENAI_IMAGE_MODEL: "gpt-image-2.5-flare",
        OPENAI_TIMEOUT_MS: "60000",
        REPLICATE_API_TOKEN: "  token  ",
        REPLICATE_MODEL: "owner/model:version",
        REPLICATE_TIMEOUT_MS: "45000",
      }),
    ).toEqual({
      imageProvider: "replicate",
      openaiApiKey: "openai-token",
      openaiModel: "gpt-image-2.5-flare",
      openaiTimeoutMs: 60_000,
      klingModel: "kling-image-o1",
      klingTimeoutMs: 180_000,
      maxUploadBytes: 10 * 1024 * 1024,
      port: 4000,
      replicateApiToken: "token",
      replicateModel: "owner/model:version",
      replicateTimeoutMs: 45_000,
    });
  });

  it.each([
    ["IMAGE_PROVIDER", { IMAGE_PROVIDER: "unknown" }],
    ["KLING_TIMEOUT_MS", { KLING_TIMEOUT_MS: "0" }],
    ["OPENAI_TIMEOUT_MS", { OPENAI_TIMEOUT_MS: "0" }],
    ["REPLICATE_MODEL", { REPLICATE_MODEL: "invalid" }],
    ["REPLICATE_TIMEOUT_MS", { REPLICATE_TIMEOUT_MS: "0" }],
  ])("rejects invalid %s configuration", (_name, source) => {
    expect(() => readEnv(source)).toThrow();
  });
});
