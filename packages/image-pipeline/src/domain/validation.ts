import type { RasterImage, SkinMask } from "./types.js";

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

export function assertRasterImage(image: RasterImage): void {
  assertPositiveInteger(image.width, "Image width");
  assertPositiveInteger(image.height, "Image height");
  if (image.data.length !== image.width * image.height * 3) {
    throw new Error("Image data must contain exactly three RGB bytes per pixel");
  }
}

export function assertSkinMask(mask: SkinMask): void {
  assertPositiveInteger(mask.width, "Mask width");
  assertPositiveInteger(mask.height, "Mask height");
  if (mask.alpha.length !== mask.width * mask.height) {
    throw new Error("Mask data must contain exactly one alpha byte per pixel");
  }
}
