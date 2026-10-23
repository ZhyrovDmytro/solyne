import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "../app.js";

describe("GET /api/v1/health", () => {
  it("returns the shared health contract", async () => {
    const response = await request(app).get("/api/v1/health").expect(200);

    expect(response.body).toEqual({
      status: "ok",
      service: "solyne-api",
    });
  });
});
