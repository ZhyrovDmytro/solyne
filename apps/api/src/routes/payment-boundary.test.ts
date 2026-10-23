import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";

describe("unconnected billing fails closed", () => {
  it.each(["/api/v1/tan", "/api/v1/tan/jobs", "/api/v1/tan/jobs/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"])("blocks %s before image work", async (path) => {
    const edit = vi.fn();
    const app = createApp({ imageEditor: { edit, model: "test", provider: "test" }, log: vi.fn() });
    const response = path.includes("aaaaaaaa")
      ? await request(app).get(path).set("Authorization", "Bearer forged")
      : await request(app).post(path).set("X-Paid", "true").send({ paid: true });
    expect(response.status).toBe(503);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).not.toHaveProperty("result");
    expect(edit).not.toHaveBeenCalled();
  });
});
