import { describe, expect, it } from "vitest";

import { assertRasterImage, assertSkinMask } from "./validation.js";

describe("image pipeline validation", () => {
  it("accepts correctly sized RGB images and masks", () => {
    expect(() => assertRasterImage({ data: new Uint8Array(12), height: 2, width: 2 })).not.toThrow();
    expect(() => assertSkinMask({ alpha: new Uint8Array(4), height: 2, width: 2 })).not.toThrow();
  });

  it("rejects mismatched buffers", () => {
    expect(() => assertRasterImage({ data: new Uint8Array(4), height: 2, width: 2 }))
      .toThrow("three RGB bytes");
    expect(() => assertSkinMask({ alpha: new Uint8Array(3), height: 2, width: 2 }))
      .toThrow("one alpha byte");
  });
});
