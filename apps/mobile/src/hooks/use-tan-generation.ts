import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useRef } from "react";

import {
  requestTanGeneration,
  TanGenerationRequestError,
} from "../services/tan-generation";
import { archiveEdit } from "../services/edit-library";
import { useTanSession, type GenerationFailure } from "../state/tan-session";

type GenerationOutcome = { status: "success" } | { error: GenerationFailure; status: "error" };
type ProcessingNavigation = "none" | "push" | "replace";

/** @deprecated Retained only for the legacy generative POC during migration. */
export function useTanGeneration() {
  const router = useRouter();
  const running = useRef(false);
  const {
    beginGeneration,
    completeGeneration,
    failGeneration,
    generation,
    originalPhoto,
    selectedPreset,
  } = useTanSession();

  const generate = useCallback(async (
    preset: typeof selectedPreset = selectedPreset,
    navigation: ProcessingNavigation = "push",
  ): Promise<GenerationOutcome> => {
    if (originalPhoto === null || running.current) {
      return {
        error: { code: "GENERATION_NOT_READY", message: "Choose a photo before continuing." },
        status: "error",
      };
    }

    running.current = true;
    beginGeneration(preset);
    if (navigation === "push") {
      router.push("/processing");
    } else if (navigation === "replace") {
      router.replace("/processing");
    }

    try {
      const result = await requestTanGeneration({ originalPhoto, preset });
      let saved;
      try {
        saved = await archiveEdit(originalPhoto, result);
      } catch {
        // The paid result must remain visible even if the local archive is unavailable.
      }
      completeGeneration(result, saved);
      router.replace("/result");
      if (saved === undefined) {
        void Image.prefetch(result.imageUrl, "disk").catch(() => false);
      }
      return { status: "success" };
    } catch (error: unknown) {
      const failure =
        error instanceof TanGenerationRequestError
          ? { code: error.code, message: error.message, requestId: error.requestId }
          : { code: "UNKNOWN_ERROR", message: "Solyne couldn't create your tan. Please try again." };

      failGeneration(failure, preset);
      return { error: failure, status: "error" };
    } finally {
      running.current = false;
    }
  }, [
    beginGeneration,
    completeGeneration,
    failGeneration,
    originalPhoto,
    router,
    selectedPreset,
  ]);

  return { generate, isGenerating: generation.status === "generating" };
}
