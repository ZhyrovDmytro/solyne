import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import type { TanGenerationResult, TanPreset } from "@solyne/shared";
import type { SavedEdit } from "../services/edit-library";

export interface OriginalPhoto {
  fileName: string;
  height: number;
  mimeType: "image/jpeg";
  source: "camera" | "library";
  uri: string;
  width: number;
}

export interface GenerationFailure {
  code: string;
  message: string;
  requestId?: string;
}

export type GenerationState =
  | { status: "idle" }
  | { preset: TanPreset; status: "generating" }
  | { result: TanGenerationResult; status: "success" }
  | { error: GenerationFailure; preset: TanPreset; status: "error" };

interface TanSessionValue {
  beginGeneration: (preset: TanPreset) => void;
  clearSession: () => void;
  completeGeneration: (result: TanGenerationResult, saved?: SavedEdit) => void;
  failGeneration: (error: GenerationFailure, preset: TanPreset) => void;
  generation: GenerationState;
  originalPhoto: OriginalPhoto | null;
  selectedPreset: TanPreset;
  setOriginalPhoto: (photo: OriginalPhoto) => void;
  setSelectedPreset: (preset: TanPreset) => void;
}

const DEFAULT_PRESET: TanPreset = "golden";
const TanSessionContext = createContext<TanSessionValue | undefined>(undefined);

export function TanSessionProvider({ children }: PropsWithChildren) {
  const [originalPhoto, setOriginalPhotoState] = useState<OriginalPhoto | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<TanPreset>(DEFAULT_PRESET);
  const [generation, setGeneration] = useState<GenerationState>({ status: "idle" });

  const value = useMemo<TanSessionValue>(
    () => ({
      beginGeneration: (preset) => {
        setSelectedPreset(preset);
        setGeneration({ preset, status: "generating" });
      },
      clearSession: () => {
        setOriginalPhotoState(null);
        setSelectedPreset(DEFAULT_PRESET);
        setGeneration({ status: "idle" });
      },
      completeGeneration: (result, saved) => {
        if (saved !== undefined) {
          setOriginalPhotoState((photo) => photo === null ? null : { ...photo, uri: saved.beforeUri });
        }
        setGeneration({
          result: saved === undefined ? result : { ...result, imageUrl: saved.afterUri },
          status: "success",
        });
      },
      failGeneration: (error, preset) => {
        setGeneration({ error, preset, status: "error" });
      },
      generation,
      originalPhoto,
      selectedPreset,
      setOriginalPhoto: (photo) => {
        setOriginalPhotoState(photo);
        setSelectedPreset(DEFAULT_PRESET);
        setGeneration({ status: "idle" });
      },
      setSelectedPreset: (preset) => {
        setSelectedPreset(preset);
        setGeneration({ status: "idle" });
      },
    }),
    [generation, originalPhoto, selectedPreset],
  );

  return <TanSessionContext.Provider value={value}>{children}</TanSessionContext.Provider>;
}

export function useTanSession(): TanSessionValue {
  const context = useContext(TanSessionContext);

  if (context === undefined) {
    throw new Error("useTanSession must be used inside TanSessionProvider");
  }

  return context;
}
