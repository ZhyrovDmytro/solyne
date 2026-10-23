import type { HealthResponse } from "@solyne/shared";

import { env } from "../config/env";

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.status === "ok" && candidate.service === "solyne-api";
}

export async function checkApiHealth(): Promise<HealthResponse> {
  const response = await fetch(`${env.apiUrl}/api/v1/health`);

  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }

  const body: unknown = await response.json();
  if (!isHealthResponse(body)) {
    throw new Error("Health response did not match the shared contract");
  }

  return body;
}
