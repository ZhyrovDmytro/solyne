import { requirePaidAccess } from "./billing";
import { Directory, File, Paths } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import type { TanGenerationResult, TanPreset } from "@solyne/shared";

import type { OriginalPhoto } from "../state/tan-session";

export interface SavedEdit {
  id: string;
  createdAt: string;
  preset: TanPreset;
  beforeUri: string;
  afterUri: string;
  width: number;
  height: number;
}

interface EditMetadata {
  id: string;
  createdAt: string;
  preset: TanPreset;
  afterFile: "after.jpg" | "after.png";
  width: number;
  height: number;
}

const PRESETS = new Set<TanPreset>(["natural", "golden", "bronze", "deep"]);
function libraryDirectory(): Directory {
  return new Directory(Paths.document, "solyne-edits");
}

function editDirectory(id: string): Directory {
  if (!/^[0-9]+-[a-z0-9]{8}$/.test(id)) {
    throw new Error("Invalid edit ID");
  }
  return new Directory(libraryDirectory(), id);
}

function parseMetadata(value: unknown): EditMetadata | null {
  if (typeof value !== "object" || value === null) return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.id !== "string" || !/^[0-9]+-[a-z0-9]{8}$/.test(data.id) ||
    typeof data.createdAt !== "string" || !Number.isFinite(Date.parse(data.createdAt)) ||
    typeof data.preset !== "string" || !PRESETS.has(data.preset as TanPreset) ||
    (data.afterFile !== "after.jpg" && data.afterFile !== "after.png") ||
    typeof data.width !== "number" || data.width <= 0 ||
    typeof data.height !== "number" || data.height <= 0
  ) return null;
  return data as unknown as EditMetadata;
}

async function readEdit(directory: Directory): Promise<SavedEdit | null> {
  const metadataFile = new File(directory, "metadata.json");
  if (!metadataFile.exists) return null;
  try {
    const metadata = parseMetadata(JSON.parse(await metadataFile.text()) as unknown);
    if (metadata === null || metadata.id !== directory.name) return null;
    const before = new File(directory, "before.jpg");
    const after = new File(directory, metadata.afterFile);
    if (!before.exists || !after.exists) return null;
    return {
      id: metadata.id,
      createdAt: metadata.createdAt,
      preset: metadata.preset,
      beforeUri: before.uri,
      afterUri: after.uri,
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    return null;
  }
}

export async function listSavedEdits(): Promise<SavedEdit[]> {
  requirePaidAccess();
  const library = libraryDirectory();
  if (!library.exists) return [];
  const entries = library.list().filter((entry): entry is Directory => entry instanceof Directory);
  const edits = await Promise.all(entries.map(readEdit));
  return edits.filter((edit): edit is SavedEdit => edit !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSavedEdit(id: string): Promise<SavedEdit | null> {
  requirePaidAccess();
  const directory = editDirectory(id);
  return directory.exists ? readEdit(directory) : null;
}

export async function archiveEdit(original: OriginalPhoto, result: TanGenerationResult): Promise<SavedEdit> {
  requirePaidAccess();
  const library = libraryDirectory();
  library.create({ idempotent: true, intermediates: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
  requirePaidAccess();
  const directory = editDirectory(id);
  directory.create();
  try {
    await new File(original.uri).copy(new File(directory, "before.jpg"));
    const temporaryResult = new File(directory, "download.tmp");
    let downloaded: File;
    if (result.imageUrl.startsWith("data:image/")) {
      const separator = result.imageUrl.indexOf(",");
      if (separator < 0) throw new Error("The edit data was invalid");
      await LegacyFileSystem.writeAsStringAsync(
        temporaryResult.uri,
        result.imageUrl.slice(separator + 1),
        { encoding: LegacyFileSystem.EncodingType.Base64 },
      );
      downloaded = temporaryResult;
    } else if (result.imageUrl.startsWith("file://")) {
      await new File(result.imageUrl).copy(temporaryResult);
      downloaded = temporaryResult;
    } else {
      downloaded = await File.downloadFileAsync(result.imageUrl, temporaryResult);
    }
    const handle = downloaded.open();
    let signature: Uint8Array;
    try {
      signature = handle.readBytes(8);
    } finally {
      handle.close();
    }
    const isPng = signature.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => signature[index] === byte);
    const isJpeg = signature.length >= 3 &&
      signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
    if (!isPng && !isJpeg) throw new Error("The edit was not a supported image");
    const afterFile = isPng ? "after.png" : "after.jpg";
    await downloaded.move(new File(directory, afterFile));
    const metadata: EditMetadata = {
      id,
      createdAt: new Date().toISOString(),
      preset: result.preset,
      afterFile,
      width: original.width,
      height: original.height,
    };
    const metadataFile = new File(directory, "metadata.json");
    metadataFile.create();
    metadataFile.write(JSON.stringify(metadata));
    const saved = await readEdit(directory);
    if (saved === null) throw new Error("Could not verify saved edit");
    return saved;
  } catch (error) {
    if (directory.exists) directory.delete();
    throw error;
  }
}

export async function deleteSavedEdit(id: string): Promise<void> {
  const directory = editDirectory(id);
  if (directory.exists) directory.delete();
}
