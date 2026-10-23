export interface PreviewData {
  height: number;
  mask: Uint8Array;
  original: Uint8ClampedArray;
  tanned: Uint8ClampedArray;
  width: number;
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function toLinear(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function toSrgb(value: number): number {
  const clamped = clamp(value);
  const encoded = clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * (clamped ** (1 / 2.4)) - 0.055;
  return Math.round(encoded * 255);
}

function tanPixel(r8: number, g8: number, b8: number): [number, number, number] {
  const r = toLinear(r8);
  const g = toLinear(g8);
  const b = toLinear(b8);
  const lRoot = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mRoot = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const sRoot = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const greenRed = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const blueYellow = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;

  const nextLightness = clamp(lightness - (0.055 + lightness * 0.035));
  const nextGreenRed = greenRed + 0.024;
  const nextBlueYellow = blueYellow + 0.052;
  const lNext = (nextLightness + 0.3963377774 * nextGreenRed + 0.2158037573 * nextBlueYellow) ** 3;
  const mNext = (nextLightness - 0.1055613458 * nextGreenRed - 0.0638541728 * nextBlueYellow) ** 3;
  const sNext = (nextLightness - 0.0894841775 * nextGreenRed - 1.291485548 * nextBlueYellow) ** 3;

  return [
    toSrgb(4.0767416621 * lNext - 3.3077115913 * mNext + 0.2309699292 * sNext),
    toSrgb(-1.2684380046 * lNext + 2.6097574011 * mNext - 0.3413193965 * sNext),
    toSrgb(-0.0041960863 * lNext - 0.7034186147 * mNext + 1.707614701 * sNext),
  ];
}

export function preparePreview(original: { data: Uint8ClampedArray; width: number; height: number }, mask: Uint8Array): PreviewData {
  if (mask.length !== original.width * original.height || original.data.length !== mask.length * 4) {
    throw new Error("Image and skin mask dimensions do not match");
  }
  const tanned = new Uint8ClampedArray(original.data);
  // Compute every pixel once so manual additions work without new inference.
  for (let offset = 0; offset < tanned.length; offset += 4) {
    const [r, g, b] = tanPixel(original.data[offset]!, original.data[offset + 1]!, original.data[offset + 2]!);
    tanned[offset] = r;
    tanned[offset + 1] = g;
    tanned[offset + 2] = b;
  }
  return { width: original.width, height: original.height, mask, original: new Uint8ClampedArray(original.data), tanned };
}

export function renderPixels(preview: PreviewData, intensity: number, showMask = false): Uint8ClampedArray<ArrayBuffer> {
  const pixels = new Uint8ClampedArray(preview.original);
  const amount = Number.isFinite(intensity) ? clamp(intensity) : 0;
  const overlay = [235, 55, 130];
  for (let pixel = 0; pixel < preview.mask.length; pixel += 1) {
    const mask = preview.mask[pixel]! / 255;
    if (mask === 0) continue;
    const offset = pixel * 4;
    const blend = mask * (showMask ? 0.66 : amount);
    for (let channel = 0; channel < 3; channel += 1) {
      const target = showMask ? overlay[channel]! : preview.tanned[offset + channel]!;
      pixels[offset + channel] = Math.round(preview.original[offset + channel]! * (1 - blend) + target * blend);
    }
  }
  return pixels;
}
