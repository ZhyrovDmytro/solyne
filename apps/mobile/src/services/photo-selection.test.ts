import { beforeEach, describe, expect, it, vi } from "vitest";
import { choosePhotoFromLibrary, takePhotoWithCamera } from "./photo-selection";

const mocks = vi.hoisted(() => ({
  libraryPermission: vi.fn(), cameraPermission: vi.fn(), library: vi.fn(), camera: vi.fn(),
  manipulate: vi.fn(), resize: vi.fn(), render: vi.fn(), save: vi.fn(),
}));
vi.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: mocks.libraryPermission,
  requestCameraPermissionsAsync: mocks.cameraPermission,
  launchImageLibraryAsync: mocks.library, launchCameraAsync: mocks.camera,
  CameraType: { back: "back" },
  UIImagePickerPreferredAssetRepresentationMode: { Current: "current" },
}));
vi.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: mocks.manipulate }, SaveFormat: { JPEG: "jpeg" },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.libraryPermission.mockResolvedValue({ granted: true });
  mocks.cameraPermission.mockResolvedValue({ granted: true });
  mocks.library.mockResolvedValue({ canceled: true });
  mocks.camera.mockResolvedValue({ canceled: true });
  mocks.manipulate.mockReturnValue({ resize: mocks.resize, renderAsync: mocks.render });
  mocks.render.mockResolvedValue({ saveAsync: mocks.save });
  mocks.save.mockResolvedValue({ uri: "file://normalized.jpg", width: 2048, height: 1536 });
});

function select(width = 4000, height = 3000) {
  mocks.library.mockResolvedValue({ canceled: false, assets: [{ uri: "file://picked.heic", fileName: "holiday.heic", width, height }] });
}

describe("photo selection before payment", () => {
  it("uses the system photo picker without requesting broad library access", async () => {
    expect(await choosePhotoFromLibrary()).toEqual({ status: "cancelled" });
    expect(mocks.libraryPermission).not.toHaveBeenCalled();
    expect(mocks.cameraPermission).not.toHaveBeenCalled();
    expect(mocks.manipulate).not.toHaveBeenCalled();
  });
  it("does not open the camera when permission is denied", async () => {
    mocks.cameraPermission.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await takePhotoWithCamera()).toEqual({ status: "permission-denied", source: "camera", canAskAgain: false });
    expect(mocks.camera).not.toHaveBeenCalled();
  });
  it("treats camera cancellation as cancellation without processing", async () => {
    expect(await takePhotoWithCamera()).toEqual({ status: "cancelled" });
    expect(mocks.manipulate).not.toHaveBeenCalled();
  });
  it("normalizes the original and caps its long edge without rendering a tan", async () => {
    select();
    expect(await choosePhotoFromLibrary()).toEqual({ status: "selected", photo: {
      uri: "file://normalized.jpg", fileName: "holiday.jpg", width: 2048, height: 1536, source: "library", mimeType: "image/jpeg",
    } });
    expect(mocks.resize).toHaveBeenCalledWith({ width: 2048, height: null });
    expect(mocks.save).toHaveBeenCalledWith({ compress: 0.9, format: "jpeg" });
  });
  it("does not upscale a small original", async () => {
    select(800, 600);
    await choosePhotoFromLibrary();
    expect(mocks.resize).not.toHaveBeenCalled();
  });
  it.each([0, -1, NaN, Infinity])("rejects an invalid dimension (%s) before decoding", async (width) => {
    select(width);
    await expect(choosePhotoFromLibrary()).rejects.toThrow("valid dimensions");
    expect(mocks.manipulate).not.toHaveBeenCalled();
  });
  it("handles a malformed picker result without an image", async () => {
    mocks.library.mockResolvedValue({ canceled: false, assets: [] });
    await expect(choosePhotoFromLibrary()).rejects.toThrow("without an image");
  });
});
