import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import type { OriginalPhoto } from "../state/tan-session";

const MAX_LONG_SIDE = 2_048;
const JPEG_QUALITY = 0.9;

type PhotoSource = "camera" | "library";

export type PhotoSelectionResult =
  | { status: "cancelled" }
  | {
      status: "permission-denied";
      source: PhotoSource;
      canAskAgain: boolean;
    }
  | {
      status: "selected";
      photo: OriginalPhoto;
    };

function getResizeTarget(width: number, height: number) {
  if (width >= height && width > MAX_LONG_SIDE) {
    return { width: MAX_LONG_SIDE, height: null };
  }

  if (height > width && height > MAX_LONG_SIDE) {
    return { width: null, height: MAX_LONG_SIDE };
  }

  return null;
}

async function normalizePhoto(
  asset: ImagePicker.ImagePickerAsset,
  source: PhotoSource,
): Promise<OriginalPhoto> {
  if (!Number.isFinite(asset.width) || !Number.isFinite(asset.height) || asset.width <= 0 || asset.height <= 0) {
    throw new Error("The selected image did not include valid dimensions");
  }

  const context = ImageManipulator.manipulate(asset.uri);
  const resizeTarget = getResizeTarget(asset.width, asset.height);

  if (resizeTarget !== null) {
    context.resize(resizeTarget);
  }

  const renderedImage = await context.renderAsync();
  const normalizedImage = await renderedImage.saveAsync({
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });

  return {
    fileName: asset.fileName?.replace(/\.[^.]+$/, ".jpg") ?? "solyne-original.jpg",
    height: normalizedImage.height,
    mimeType: "image/jpeg",
    source,
    uri: normalizedImage.uri,
    width: normalizedImage.width,
  };
}

async function selectPhoto(
  source: PhotoSource,
  permission?: ImagePicker.PermissionResponse,
): Promise<PhotoSelectionResult> {
  if (permission !== undefined && !permission.granted) {
    return {
      status: "permission-denied",
      source,
      canAskAgain: permission.canAskAgain,
    };
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          cameraType: ImagePicker.CameraType.back,
          mediaTypes: ["images"],
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          allowsMultipleSelection: false,
          mediaTypes: ["images"],
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
          quality: 1,
        });

  if (result.canceled) {
    return { status: "cancelled" };
  }

  const asset = result.assets[0];
  if (asset === undefined) {
    throw new Error("The image picker completed without an image");
  }

  return {
    status: "selected",
    photo: await normalizePhoto(asset, source),
  };
}

export async function choosePhotoFromLibrary(): Promise<PhotoSelectionResult> {
  // The system picker grants access to the selected photo without broad library permission.
  return selectPhoto("library");
}

export async function takePhotoWithCamera(): Promise<PhotoSelectionResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  return selectPhoto("camera", permission);
}
