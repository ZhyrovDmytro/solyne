import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveLocalTanPreview } from "./local-tan";

const write = vi.hoisted(() => vi.fn());
vi.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache" },
  File: class { uri: string; constructor(root: string, name: string) { this.uri = `${root}/${name}`; } },
}));
vi.mock("expo-file-system/legacy", () => ({ EncodingType: { Base64: "base64" }, writeAsStringAsync: write }));

describe("local skin edit export", () => {
  beforeEach(() => write.mockReset());
  it("saves lossless PNG and marks it as a local result", async () => {
    const result = await saveLocalTanPreview("data:image/png;base64,iVBORw0KGgo=", 0.5, 250);
    expect(result.imageUrl).toMatch(/\.png$/);
    expect(result.provider).toBe("local-mediapipe-skin");
    expect(result.preset).toBe("golden");
    expect(write).toHaveBeenCalledWith(result.imageUrl, "iVBORw0KGgo=", { encoding: "base64" });
  });
  it("rejects failed canvas serialization without writing a result", async () => {
    await expect(saveLocalTanPreview("data:,", 0.5, 250)).rejects.toThrow("PNG");
    expect(write).not.toHaveBeenCalled();
  });
  it("propagates a storage failure so the editor can offer retry", async () => {
    write.mockRejectedValueOnce(new Error("disk full"));
    await expect(saveLocalTanPreview("data:image/png;base64,iVBORw0KGgo=", 0.5, 250)).rejects.toThrow("disk full");
  });
});

vi.mock("./billing", () => ({ requirePaidAccess: vi.fn() }));
