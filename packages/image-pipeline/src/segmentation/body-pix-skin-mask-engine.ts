import * as bodyPix from "@tensorflow-models/body-pix";
import * as tf from "@tensorflow/tfjs";

import type {
  RasterImage,
  SkinMaskEngine,
  SkinMaskResult,
} from "../domain/types.js";
import { assertRasterImage } from "../domain/validation.js";
import { skinColorConsistency } from "./skin-color.js";

const MODEL_NAME = "BodyPix MobileNetV1 0.75 / stride 16 / quantBytes 2";

export class BodyPixSkinMaskEngine implements SkinMaskEngine {
  private modelPromise: Promise<bodyPix.BodyPix> | undefined;

  private async model(): Promise<bodyPix.BodyPix> {
    if (this.modelPromise === undefined) {
      this.modelPromise = (async () => {
        await tf.setBackend("cpu");
        await tf.ready();
        return bodyPix.load({
          architecture: "MobileNetV1",
          multiplier: 0.75,
          outputStride: 16,
          quantBytes: 2,
        });
      })();
    }
    return this.modelPromise;
  }

  async segment(input: RasterImage): Promise<SkinMaskResult> {
    assertRasterImage(input);
    const model = await this.model();
    const tensor = tf.tensor3d(input.data, [input.height, input.width, 3], "int32");
    const startedAt = performance.now();

    try {
      const parts = await model.segmentPersonParts(tensor, {
        flipHorizontal: false,
        internalResolution: "high",
        segmentationThreshold: 0.6,
      });
      const alpha = new Uint8Array(input.width * input.height);
      let selectedPixels = 0;

      for (let pixel = 0; pixel < parts.data.length; pixel += 1) {
        if (parts.data[pixel] === -1) continue;
        const rgbOffset = pixel * 3;
        const r = input.data[rgbOffset];
        const g = input.data[rgbOffset + 1];
        const b = input.data[rgbOffset + 2];
        if (r === undefined || g === undefined || b === undefined) continue;

        const score = skinColorConsistency(r, g, b);
        if (score < 0.18) continue;
        alpha[pixel] = Math.round(255 * score);
        selectedPixels += 1;
      }

      return {
        diagnostics: {
          engine: "body-pix-skin-mask",
          inferenceMs: Math.round(performance.now() - startedAt),
          model: MODEL_NAME,
          selectedPixelRatio: selectedPixels / alpha.length,
        },
        mask: { alpha, height: input.height, width: input.width },
      };
    } finally {
      tensor.dispose();
    }
  }

  async dispose(): Promise<void> {
    if (this.modelPromise !== undefined) {
      (await this.modelPromise).dispose();
      this.modelPromise = undefined;
    }
  }
}
