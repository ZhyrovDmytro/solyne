import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeMediaPipe } from "./mediapipe-logging";

const startup = "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.";
afterEach(() => vi.restoreAllMocks());

describe("MediaPipe startup logging", () => {
  it("routes the known startup notice to info and keeps real errors visible", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await initializeMediaPipe(async () => {
      console.error(startup);
      console.error("Model initialization failed", { code: 42 });
      console.error(`${startup} Unexpected failure`);
    });
    expect(info).toHaveBeenCalledWith(startup);
    expect(error).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledWith("Model initialization failed", { code: 42 });
    expect(console.error).toBe(error);
  });
  it("restores logging and propagates initialization failures", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(initializeMediaPipe(async () => { throw new Error("bad model"); })).rejects.toThrow("bad model");
    expect(console.error).toBe(error);
  });
  it("keeps routing active until overlapping initializations finish", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    let finish!: () => void;
    const first = initializeMediaPipe(() => new Promise<void>(resolve => { finish = resolve; }));
    await initializeMediaPipe(async () => { console.error(startup); });
    expect(console.error).not.toBe(error);
    finish();
    await first;
    expect(console.error).toBe(error);
    expect(info).toHaveBeenCalledOnce();
  });
});
