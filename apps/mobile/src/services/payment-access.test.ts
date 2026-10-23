import { describe, expect, it, vi } from "vitest";
import { photoDataUrl, saveLocalTanPreview } from "./local-tan";
import { archiveEdit, getSavedEdit, listSavedEdits } from "./edit-library";
import { saveGeneratedPhoto } from "./result-saving";
import { requestTanGeneration } from "./tan-generation";
import type { OriginalPhoto } from "../state/tan-session";

const effects = vi.hoisted(() => ({ file: vi.fn(), fetch: vi.fn(), write: vi.fn(), directory: vi.fn(), permissions: vi.fn() }));
vi.mock("expo-file-system", () => ({ File: effects.file, Directory: effects.directory, Paths: { cache: "cache", document: "document" } }));
vi.mock("expo-file-system/legacy", () => ({ EncodingType: { Base64: "base64" }, writeAsStringAsync: effects.write }));
vi.mock("expo/fetch", () => ({ fetch: effects.fetch }));
vi.mock("expo-media-library", () => ({ requestPermissionsAsync: effects.permissions }));


const photo: OriginalPhoto = { uri: "file://original.jpg", fileName: "original.jpg", source: "library", mimeType: "image/jpeg", width: 100, height: 100 };
const result = { imageUrl: "file://edited.png", preset: "golden" as const, durationMs: 10, provider: "test" };

describe("unpaid image access", () => {
  it.each([
    ["read original into renderer", () => photoDataUrl(photo)],
    ["write an export", () => saveLocalTanPreview("data:image/png;base64,AAAA", 0.5, 10)],
    ["save to Photos", () => saveGeneratedPhoto(result.imageUrl)],
    ["archive", () => archiveEdit(photo, result)],
    ["list edited photos", () => listSavedEdits()],
    ["read an archived result", () => getSavedEdit("12345678-abcdefgh")],
    ["request cloud generation", () => requestTanGeneration({ originalPhoto: photo, preset: "golden" })],
  ] as const)("blocks %s before filesystem, permission or network work", async (_name, action) => {
    await expect(action()).rejects.toThrow("verified Solyne membership");
    for (const effect of Object.values(effects)) expect(effect).not.toHaveBeenCalled();
  });
});
