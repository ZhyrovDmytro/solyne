import { describe, expect, it } from "vitest";
import { photoTransform } from "./photo-transform";

describe("fullscreen photo brush coordinates", () => {
  it("accounts for the horizontal crop when filling a portrait screen", () => {
    const result = photoTransform({ width: 1000, height: 1000 }, { width: 400, height: 800 }, "cover");
    expect(result).toEqual({ scale: 0.8, left: -200, top: 0 });
    expect((200 - result.left) / result.scale).toBe(500);
  });
  it("accounts for letterboxing when the full mask is fitted above tools", () => {
    const result = photoTransform({ width: 1000, height: 2000 }, { width: 400, height: 400 }, "contain");
    expect(result).toEqual({ scale: 0.2, left: 100, top: 0 });
    expect((100 - result.left) / result.scale).toBe(0);
    expect(18 / result.scale / 2).toBe(45);
  });
});
