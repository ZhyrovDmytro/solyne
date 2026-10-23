import { describe, expect, it } from "vitest";
import { preparePreview, renderPixels } from "./tan-renderer";

describe("skin-only renderer", () => {
  const data = Uint8ClampedArray.of(180, 130, 100, 255, 180, 130, 100, 255);
  it("changes only selected pixels, retaining alpha and the immutable original", () => {
    const preview = preparePreview({ data, width: 2, height: 1 }, Uint8Array.of(255, 0));
    const output = renderPixels(preview, 1);
    expect(output.slice(0, 3)).not.toEqual(data.slice(0, 3));
    expect(output.slice(4)).toEqual(data.slice(4));
    expect(output[3]).toBe(255);
    expect(preview.original).toEqual(data);
    expect(renderPixels(preview, 0)).toEqual(data);
    expect(renderPixels(preview, 0.5)).toEqual(renderPixels(preview, 0.5));
  });
  it("supports manually added skin and keeps the selection overlay out of normal renders", () => {
    const preview = preparePreview({ data, width: 2, height: 1 }, new Uint8Array(2));
    preview.mask[1] = 255;
    expect(renderPixels(preview, 1).slice(4, 7)).not.toEqual(data.slice(4, 7));
    expect(renderPixels(preview, 0)).toEqual(data);
    expect(renderPixels(preview, 0, true)).not.toEqual(data);
  });
});
