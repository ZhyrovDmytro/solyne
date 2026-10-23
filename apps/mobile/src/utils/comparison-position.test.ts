import { describe, expect, it } from "vitest";
import { comparisonIntro, comparisonPosition } from "./comparison-position";

describe("comparison drag", () => {
  it("tracks the finger across the entire inset photo without native thumb offsets", () => {
    expect(comparisonPosition(8, 8, 400)).toBe(0);
    expect(comparisonPosition(208, 8, 400)).toBe(50);
    expect(comparisonPosition(408, 8, 400)).toBe(100);
  });
  it("clamps a captured pointer outside the photo", () => {
    expect(comparisonPosition(-20, 8, 400)).toBe(0);
    expect(comparisonPosition(500, 8, 400)).toBe(100);
    expect(comparisonPosition(50, 8, 0)).toBe(50);
  });
  it("introduces the slider left, right, then finishes exactly centered", () => {
    expect([0, 1 / 3, 2 / 3, 1].map(comparisonIntro)).toEqual([50, 38, 62, 50]);
    expect(comparisonIntro(2)).toBe(50);
  });
});
