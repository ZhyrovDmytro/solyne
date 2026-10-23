import { requirePaidAccess } from "./billing";
import { File, Paths } from "expo-file-system";

export type SaveResult =
  | { status: "permission-denied"; canAskAgain: boolean }
  | { status: "saved" };

export async function saveGeneratedPhoto(imageUrl: string): Promise<SaveResult> {
  requirePaidAccess();
  const { Asset, requestPermissionsAsync } = await import("expo-media-library");
  const permission = await requestPermissionsAsync(true, ["photo"]);
  if (!permission.granted) {
    return { status: "permission-denied", canAskAgain: permission.canAskAgain };
  }

  if (imageUrl.startsWith("file://")) {
    await Asset.create(imageUrl);
    return { status: "saved" };
  }

  let downloadedFile: File | undefined;

  try {
    const destination = new File(Paths.cache, `solyne-result-${Date.now()}.jpg`);
    downloadedFile = await File.downloadFileAsync(imageUrl, destination);
    await Asset.create(downloadedFile.uri);
    return { status: "saved" };
  } finally {
    if (downloadedFile?.exists) {
      downloadedFile.delete();
    }
  }
}
