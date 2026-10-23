import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import LiveTanEditor from "./live-tan-editor";

vi.mock("../image-engine/skin-detector", () => ({ detectSkin: vi.fn() }));

function render(adjusting) {
  return renderToStaticMarkup(createElement(LiveTanEditor, {
    imageDataUrl: "data:image/png;base64,test",
    adjusting,
    onAdjustingChange: vi.fn(),
    onReady: vi.fn(),
    onError: vi.fn(),
    onExport: vi.fn(),
  }));
}

describe("result-first tan flow", () => {
  it("shows save and change actions without adjustment controls", () => {
    const result = render(false);
    expect(result).toContain("Save to Photos");
    expect(result).toContain("Adjust tan");
    expect(result).not.toContain('id="intensity"');
    expect(result).not.toContain("Refine selection");
  });

  it("opens adjustments with Golden intensity and mask refinement", () => {
    const result = render(true);
    expect(result).toContain('value="50"');
    expect(result).toContain("Refine selection");
    expect(result).toContain(">Done</button>");
    expect(result).not.toContain("Save to Photos");
  });
});
