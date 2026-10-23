import { describe, expect, it } from "vitest";
import { skinMaskFromConfidence, resizeMask, paintMaskStroke, featherInside } from "./skin-mask";

describe("semantic skin selection", () => {
  it("selects face/body while excluding hair, clothing, background and accessories", () => {
    const scores = Array.from({ length: 6 }, (_, category) =>
      Float32Array.from({ length: 6 }, (_, pixel) => pixel === category ? 0.95 : 0.01));
    expect([...skinMaskFromConfidence(scores, 6, 1)]).toEqual([0, 0, 255, 255, 0, 0]);
  });
  it("rejects ambiguous predictions instead of tinting uncertain regions", () => {
    const scores = [0.1, 0.3, 0.25, 0.25, 0.05, 0.05].map(value => Float32Array.of(value));
    expect(skinMaskFromConfidence(scores, 1, 1)[0]).toBe(0);
  });
  it("rejects mismatched model output", () => {
    expect(() => skinMaskFromConfidence([], 2, 2)).toThrow();
  });
  it("feathers inward without painting excluded pixels or filling holes", () => {
    const mask = new Uint8Array(25).fill(255);
    mask[12] = 0;
    const result = featherInside(mask, 5, 5);
    expect(result[12]).toBe(0);
    expect(result[11]).toBeLessThan(255);
    expect(result[0]).toBe(255);
    expect(mask[11]).toBe(255);
  });
  it("aligns the export mask and preserves excluded support when enlarging", () => {
    const result = resizeMask(Uint8Array.of(255, 0), 2, 1, 4, 2);
    expect(result[0]).toBe(255);
    expect(result[1]).toBeGreaterThan(0);
    expect(result[2]).toBe(0);
    expect(result[3]).toBe(0);
  });
  it("paints continuous strokes, supports erase and does not touch distant pixels", () => {
    const mask = new Uint8Array(100);
    paintMaskStroke(mask, 10, 10, { x: 2, y: 5 }, { x: 8, y: 5 }, 2, "add");
    expect(mask[55]).toBe(255);
    expect(mask[0]).toBe(0);
    paintMaskStroke(mask, 10, 10, { x: 5, y: 5 }, { x: 5, y: 5 }, 1, "remove");
    expect(mask[55]).toBe(0);
    expect(mask[52]).toBe(255);
  });
});

describe("facial detail protection", () => {
  it("cuts out a feature polygon without clearing neighboring skin", async () => {
    const { excludePolygons } = await import("./skin-mask");
    const mask = new Uint8Array(36).fill(255);
    excludePolygons(mask, 6, 6, [[{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 4 }, { x: 2, y: 4 }]]);
    expect(mask[2 * 6 + 2]).toBe(0);
    expect(mask[3 * 6 + 3]).toBe(0);
    expect(mask[1 * 6 + 2]).toBe(255);
  });
});
