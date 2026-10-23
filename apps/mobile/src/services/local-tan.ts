import { requirePaidAccess } from "./billing";
import { File, Paths } from "expo-file-system";
import { EncodingType, writeAsStringAsync } from "expo-file-system/legacy";
import type { TanGenerationResult, TanPreset } from "@solyne/shared";

import type { OriginalPhoto } from "../state/tan-session";

export async function photoDataUrl(photo: OriginalPhoto): Promise<string> {
  requirePaidAccess();
  const file = new File(photo.uri);
  if (!file.exists) throw new Error("The selected photo is no longer available");
  return `data:${photo.mimeType};base64,${await file.base64()}`;
}

function presetForIntensity(intensity: number): TanPreset {
  if (intensity < 0.3) return "natural";
  if (intensity < 0.6) return "golden";
  if (intensity < 0.84) return "bronze";
  return "deep";
}

export async function saveLocalTanPreview(
  dataUrl: string,
  intensity: number,
  segmentationMs: number,
): Promise<TanGenerationResult> {
  requirePaidAccess();
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (match?.[1] === undefined) throw new Error("The local preview was not a valid PNG");

  const destination = new File(Paths.cache, `solyne-local-tan-${Date.now()}.png`);
  await writeAsStringAsync(destination.uri, match[1], { encoding: EncodingType.Base64 });
  return {
    durationMs: segmentationMs,
    imageUrl: destination.uri,
    preset: presetForIntensity(intensity),
    provider: "local-mediapipe-skin",
  };
}
