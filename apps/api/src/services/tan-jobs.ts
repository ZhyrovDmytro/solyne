import type { TanGenerationResult } from "@solyne/shared";

import { ApplicationError } from "../errors/application-error.js";
import { TanGenerationService, type GenerateTanInput } from "./tan-generation.js";

type TanJob =
  | { createdAt: number; status: "processing" }
  | { createdAt: number; result: TanGenerationResult; status: "success" }
  | { createdAt: number; error: ApplicationError; status: "error" };

const JOB_TTL_MS = 30 * 60 * 1_000;

export class TanJobs {
  private readonly jobs = new Map<string, TanJob>();

  constructor(private readonly generationService: TanGenerationService) {}

  start(input: GenerateTanInput): void {
    const createdAt = Date.now();
    for (const [requestId, job] of this.jobs) {
      if (createdAt - job.createdAt > JOB_TTL_MS) {
        this.jobs.delete(requestId);
      }
    }
    this.jobs.set(input.requestId, { createdAt, status: "processing" });

    void this.generationService.generate(input).then(
      (result) => this.jobs.set(input.requestId, { createdAt, result, status: "success" }),
      (error: unknown) => this.jobs.set(input.requestId, {
        createdAt,
        error: error instanceof ApplicationError
          ? error
          : new ApplicationError("INTERNAL_ERROR", "Something went wrong. Please try again.", 500),
        status: "error",
      }),
    );
  }

  get(requestId: string): TanJob | undefined {
    const job = this.jobs.get(requestId);
    if (job !== undefined && Date.now() - job.createdAt > JOB_TTL_MS) {
      this.jobs.delete(requestId);
      return undefined;
    }
    return job;
  }
}
