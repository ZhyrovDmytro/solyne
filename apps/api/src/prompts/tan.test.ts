import { TAN_PRESETS } from "@solyne/shared";
import { describe, expect, it } from "vitest";

import { buildTanPrompt } from "./tan.js";

describe("buildTanPrompt", () => {
  it.each(TAN_PRESETS)("adds distinct guidance for the %s preset", (preset) => {
    const prompt = buildTanPrompt(preset);

    expect(prompt).toContain("supplied photograph as the sole visual source");
    expect(prompt).toContain("visible starting skin tone");
    expect(prompt).toContain("existing scene illumination");
    expect(prompt).toContain("light direction and color");
    expect(prompt).toContain("white balance");
    expect(prompt).toContain("highlight and shadow gradients");
    expect(prompt).toContain("same position, shape, and brightness relationship");
    expect(prompt).toContain("pixel-aligned");
    expect(prompt).toContain("do not crop, zoom, translate, rotate, reframe, reconstruct, extend, or move");
    expect(prompt).toContain("all non-skin pixels visually identical");
    expect(prompt).toContain("Preserve the exact identity");
    expect(prompt).toContain("Tan level:");
  });

  it("keeps preset prompts distinct", () => {
    const prompts = TAN_PRESETS.map(buildTanPrompt);

    expect(new Set(prompts).size).toBe(TAN_PRESETS.length);
  });
});
