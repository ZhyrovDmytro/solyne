import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import type { RasterImage, SkinMaskEngine } from "../domain/types.js";

export interface BenchmarkOptions {
  readonly inputPath: string;
  readonly maxEdge: number;
  readonly outputDirectory: string;
}

interface LoadedImage {
  readonly image: RasterImage;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
}

async function loadImage(inputPath: string, maxEdge: number): Promise<LoadedImage> {
  const sourceMetadata = await sharp(inputPath).metadata();
  if (sourceMetadata.width === undefined || sourceMetadata.height === undefined) {
    throw new Error(`Could not read image dimensions: ${inputPath}`);
  }

  const normalized = await sharp(inputPath)
    .rotate()
    .resize({
      fit: "inside",
      height: maxEdge,
      width: maxEdge,
      withoutEnlargement: true,
    })
    .toColourspace("srgb")
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (normalized.info.channels !== 3) {
    throw new Error(`Expected an RGB image but decoded ${normalized.info.channels} channels`);
  }

  return {
    image: {
      data: new Uint8Array(normalized.data),
      height: normalized.info.height,
      width: normalized.info.width,
    },
    sourceHeight: sourceMetadata.height,
    sourceWidth: sourceMetadata.width,
  };
}

function createOverlay(image: RasterImage, alpha: Uint8Array): Uint8Array {
  const output = new Uint8Array(image.data.length);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    const offset = pixel * 3;
    const maskStrength = (alpha[pixel] ?? 0) / 255 * 0.58;
    output[offset] = Math.round((image.data[offset] ?? 0) * (1 - maskStrength) + 230 * maskStrength);
    output[offset + 1] = Math.round((image.data[offset + 1] ?? 0) * (1 - maskStrength) + 52 * maskStrength);
    output[offset + 2] = Math.round((image.data[offset + 2] ?? 0) * (1 - maskStrength) + 120 * maskStrength);
  }
  return output;
}

export async function createBenchmarkArtifacts(
  engine: SkinMaskEngine,
  options: BenchmarkOptions,
): Promise<string> {
  const loaded = await loadImage(options.inputPath, options.maxEdge);
  const result = await engine.segment(loaded.image);
  await mkdir(options.outputDirectory, { recursive: true });

  const imageInfo = {
    height: loaded.image.height,
    width: loaded.image.width,
    channels: 3 as const,
  };
  const originalPath = path.join(options.outputDirectory, "original.jpg");
  const maskPath = path.join(options.outputDirectory, "raw-mask.png");
  const overlayPath = path.join(options.outputDirectory, "raw-mask-overlay.jpg");
  const manifestPath = path.join(options.outputDirectory, "benchmark.json");

  await Promise.all([
    sharp(loaded.image.data, { raw: imageInfo }).jpeg({ quality: 94 }).toFile(originalPath),
    sharp(result.mask.alpha, {
      raw: { channels: 1, height: result.mask.height, width: result.mask.width },
    }).png().toFile(maskPath),
    sharp(createOverlay(loaded.image, result.mask.alpha), { raw: imageInfo })
      .jpeg({ quality: 94 })
      .toFile(overlayPath),
  ]);

  await writeFile(manifestPath, `${JSON.stringify({
    diagnostics: result.diagnostics,
    generatedAt: new Date().toISOString(),
    input: {
      fileName: path.basename(options.inputPath),
      normalizedHeight: loaded.image.height,
      normalizedWidth: loaded.image.width,
      sourceHeight: loaded.sourceHeight,
      sourceWidth: loaded.sourceWidth,
    },
    limitations: [
      "BodyPix selects anatomical regions but does not classify exposed skin directly.",
      "The secondary color-consistency gate can miss skin under unusual lighting or include skin-colored clothing.",
      "This raw M1 mask has no morphological cleanup, feature exclusions, or edge-aware refinement.",
    ],
  }, null, 2)}\n`, "utf8");

  return manifestPath;
}
