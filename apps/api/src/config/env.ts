import { fileURLToPath } from "node:url";

import { config as loadDotEnv } from "dotenv";

loadDotEnv({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)), quiet: true });

const DEFAULT_PORT = 3000;
const DEFAULT_MAX_UPLOAD_MB = 15;
const DEFAULT_REPLICATE_MODEL = "black-forest-labs/flux-kontext-pro";
const DEFAULT_REPLICATE_TIMEOUT_MS = 120_000;
const DEFAULT_KLING_MODEL = "kling-image-v3_0_omni";
const DEFAULT_KLING_TIMEOUT_MS = 210_000;
const DEFAULT_OPENAI_MODEL = "gpt-image-2.5-sunburst";
const DEFAULT_OPENAI_TIMEOUT_MS = 180_000;

function readProvider(value: string | undefined): "openai" | "kling" | "replicate" {
  const provider = value?.trim() || "openai";
  if (provider !== "openai" && provider !== "kling" && provider !== "replicate") {
    throw new Error("IMAGE_PROVIDER must be openai, kling, or replicate");
  }
  return provider;
}

function readPort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
}

function readPositiveNumber(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${name} must be a positive number`);
  }

  return number;
}

function readModel(value: string | undefined): `${string}/${string}` | `${string}/${string}:${string}` {
  const model = value?.trim() || DEFAULT_REPLICATE_MODEL;
  if (!/^[^\s/:]+\/[^\s/:]+(?::[^\s:]+)?$/.test(model)) {
    throw new Error("REPLICATE_MODEL must use owner/model or owner/model:version format");
  }

  return model as `${string}/${string}` | `${string}/${string}:${string}`;
}

function readOptionalSecret(value: string | undefined): string | undefined {
  const secret = value?.trim();
  return secret === "" ? undefined : secret;
}

export function readEnv(source: NodeJS.ProcessEnv) {
  const imageProvider = readProvider(source.IMAGE_PROVIDER);
  if (source.NODE_ENV === "production" && imageProvider === "kling") {
    throw new Error(
      "The personal Kling CLI sign-in is local POC only. Configure an approved production provider before launch.",
    );
  }
  return {
    imageProvider,
    openaiApiKey: readOptionalSecret(source.OPENAI_API_KEY),
    openaiModel: source.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
    openaiTimeoutMs: readPositiveNumber(
      "OPENAI_TIMEOUT_MS",
      source.OPENAI_TIMEOUT_MS,
      DEFAULT_OPENAI_TIMEOUT_MS,
    ),
    klingModel: source.KLING_MODEL?.trim() || DEFAULT_KLING_MODEL,
    klingTimeoutMs: readPositiveNumber(
      "KLING_TIMEOUT_MS",
      source.KLING_TIMEOUT_MS,
      DEFAULT_KLING_TIMEOUT_MS,
    ),
    maxUploadBytes:
      readPositiveNumber("MAX_UPLOAD_MB", source.MAX_UPLOAD_MB, DEFAULT_MAX_UPLOAD_MB) *
      1024 *
      1024,
    port: readPort(source.PORT),
    replicateApiToken: readOptionalSecret(source.REPLICATE_API_TOKEN),
    replicateModel: readModel(source.REPLICATE_MODEL),
    replicateTimeoutMs: readPositiveNumber(
      "REPLICATE_TIMEOUT_MS",
      source.REPLICATE_TIMEOUT_MS,
      DEFAULT_REPLICATE_TIMEOUT_MS,
    ),
  } as const;
}

export const env = readEnv(process.env);
