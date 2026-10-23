import { describe, expect, it } from "vitest";

import { skinColorConsistency } from "./skin-color.js";

describe("skinColorConsistency", () => {
  it("keeps a broad range of plausible source-relative skin colors", () => {
    expect(skinColorConsistency(224, 170, 145)).toBeGreaterThan(0.5);
    expect(skinColorConsistency(105, 70, 58)).toBeGreaterThan(0.5);
    expect(skinColorConsistency(55, 37, 31)).toBeGreaterThan(0.25);
  });

  it("rejects strongly non-skin colors", () => {
    expect(skinColorConsistency(20, 80, 220)).toBe(0);
    expect(skinColorConsistency(20, 210, 45)).toBe(0);
    expect(skinColorConsistency(42, 48, 64)).toBe(0);
    expect(skinColorConsistency(80, 80, 80)).toBe(0);
  });
});
