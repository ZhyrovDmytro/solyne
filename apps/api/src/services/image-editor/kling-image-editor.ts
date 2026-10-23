import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ImageEditInput, ImageEditResult, ImageEditor } from "./image-editor.js";
import {
  ImageEditorProviderError,
  ImageEditorSafetyError,
  ImageEditorTimeoutError,
  ImageEditorUnavailableError,
} from "./image-editor.js";

interface KlingOptions {
  model: string;
  timeoutMs: number;
}

export type KlingRunner = (args: string[], timeoutMs: number) => Promise<unknown>;

function runKling(args: string[], timeoutMs: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    execFile("kling", args, { maxBuffer: 1024 * 1024, timeout: timeoutMs }, (error, stdout) => {
      try {
        resolve(JSON.parse(stdout) as unknown);
      } catch {
        reject(error ?? new ImageEditorProviderError());
      }
    });
  });
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function bodyOf(value: unknown): Record<string, unknown> | undefined {
  const envelope = getRecord(value);
  return getRecord(envelope?.body) ?? envelope;
}

function generationId(value: unknown): string {
  if (getRecord(value)?.ok === false) {
    const body = bodyOf(value);
    throw normalizeError(new Error(String(body?.message ?? body?.error ?? "")));
  }
  const body = bodyOf(value);
  const candidate = body?.generationId ?? body?.generation_id;
  if (typeof candidate !== "string" || !/^[A-Za-z0-9_-]{1,256}$/.test(candidate)) {
    throw new ImageEditorProviderError();
  }
  return candidate;
}

function taskResult(value: unknown): { body: Record<string, unknown> | undefined; status: string | undefined; timedOut: boolean } {
  const outerBody = bodyOf(value);
  if (outerBody?.polled === true) {
    const generations = outerBody.generations;
    const first = Array.isArray(generations) ? getRecord(generations[0]) : undefined;
    const body = getRecord(first?.result);
    const status = first?.status ?? body?.status;
    return {
      body,
      status: typeof status === "string" ? status : undefined,
      timedOut: outerBody.timedOut === true,
    };
  }
  return {
    body: outerBody,
    status: typeof outerBody?.status === "string" ? outerBody.status : undefined,
    timedOut: false,
  };
}

function resultUrl(value: unknown): string {
  const task = taskResult(value);
  const result = task.body;
  const status = task.status?.toLowerCase();
  if (task.timedOut) {
    throw new ImageEditorTimeoutError();
  }
  if (status === "failed" || status === "cancelled") {
    const message = result?.message ?? result?.error;
    throw normalizeError(typeof message === "string" ? new Error(message) : undefined);
  }
  if (status === "queued" || status === "queuing" || status === "running" || status === "processing" || status === "submitted") {
    throw new ImageEditorTimeoutError();
  }
  const works = result?.works;
  const firstWork = Array.isArray(works) ? getRecord(works[0]) : undefined;
  const candidate = firstWork?.urlWithoutWatermark ?? firstWork?.url_without_watermark ?? firstWork?.url;

  if (typeof candidate !== "string") {
    throw new ImageEditorProviderError();
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") {
      throw new ImageEditorProviderError();
    }
    return url.toString();
  } catch {
    throw new ImageEditorProviderError();
  }
}

function normalizeError(error: unknown): Error {
  if (error instanceof ImageEditorProviderError || error instanceof ImageEditorTimeoutError || error instanceof ImageEditorSafetyError || error instanceof ImageEditorUnavailableError) {
    return error;
  }
  const record = getRecord(error);
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (record?.code === "ENOENT" || /not logged in|login required|unauthorized/.test(message)) {
    return new ImageEditorUnavailableError();
  }
  if (record?.killed === true || /timed out|timeout/.test(message)) {
    return new ImageEditorTimeoutError();
  }
  if (/nsfw|safety|moderation|flagged/.test(message)) {
    return new ImageEditorSafetyError();
  }
  return new ImageEditorProviderError();
}

export class KlingImageEditor implements ImageEditor {
  readonly provider = "kling";
  readonly model: string;

  constructor(
    private readonly options: KlingOptions,
    private readonly run: KlingRunner = runKling,
  ) {
    this.model = options.model;
  }

  async edit(input: ImageEditInput): Promise<ImageEditResult> {
    if (input.mimeType !== "image/jpeg" && input.mimeType !== "image/png") {
      throw new ImageEditorProviderError();
    }

    const directory = await mkdtemp(join(tmpdir(), "solyne-kling-"));
    const imagePath = join(directory, input.mimeType === "image/png" ? "original.png" : "original.jpg");
    const startedAt = Date.now();

    try {
      await writeFile(imagePath, input.image, { mode: 0o600 });
      const submission = await this.run([
        "image_to_image",
        "--model", this.model,
        "--image", imagePath,
        "--aspectRatio", "auto",
        "--imgResolution", "2k",
        "--imageCount", "1",
        `Use 图片1 as the exact original photograph. ${input.prompt}`,
      ], this.options.timeoutMs);
      const id = generationId(submission);
      const submittedBody = bodyOf(submission);
      const creditsConsumed = submittedBody?.creditsConsumed ?? submittedBody?.credits_consumed;
      console.info(JSON.stringify({
        event: "kling_task_submitted",
        requestId: input.requestId,
        generationId: id,
        creditsConsumed: typeof creditsConsumed === "number" ? creditsConsumed : undefined,
      }));
      const remainingMs = this.options.timeoutMs - (Date.now() - startedAt);
      if (remainingMs < 6_000) {
        throw new ImageEditorTimeoutError();
      }
      const pollSeconds = Math.min(180, Math.floor((remainingMs - 5_000) / 1_000));
      const result = await this.run(["query_tasks", id, "--poll", String(pollSeconds)], remainingMs);
      const queried = taskResult(result);
      const resultBody = queried.body;
      const status = queried.status;
      console.info(JSON.stringify({
        event: "kling_task_queried",
        requestId: input.requestId,
        generationId: id,
        status: typeof status === "string" && /^[A-Za-z_]{1,32}$/.test(status) ? status : undefined,
        workCount: Array.isArray(resultBody?.works) ? resultBody.works.length : undefined,
      }));
      return { imageUrl: resultUrl(result) };
    } catch (error: unknown) {
      throw normalizeError(error);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  }
}
