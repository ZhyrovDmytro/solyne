import { describe, expect, it } from "vitest";

import { fitPhotoFrame } from "./fit-photo-frame";

describe("fitPhotoFrame", () => {
  it("fits a portrait photo by height without changing its aspect ratio", () => {
    expect(fitPhotoFrame({ height: 600, width: 400 }, 0.5)).toEqual({
      height: 600,
      width: 300,
    });
  });

  it("fits a landscape photo by width without changing its aspect ratio", () => {
    expect(fitPhotoFrame({ height: 600, width: 400 }, 2)).toEqual({
      height: 200,
      width: 400,
    });
  });

  it("returns an empty frame until valid layout dimensions are available", () => {
    expect(fitPhotoFrame({ height: 0, width: 400 }, 1)).toEqual({ height: 0, width: 0 });
  });
});
