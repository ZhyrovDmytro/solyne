interface Size {
  height: number;
  width: number;
}

export function fitPhotoFrame(available: Size, aspectRatio: number): Size {
  if (
    available.height <= 0 ||
    available.width <= 0 ||
    !Number.isFinite(aspectRatio) ||
    aspectRatio <= 0
  ) {
    return { height: 0, width: 0 };
  }

  const availableAspectRatio = available.width / available.height;
  if (aspectRatio >= availableAspectRatio) {
    return { height: available.width / aspectRatio, width: available.width };
  }

  return { height: available.height, width: available.height * aspectRatio };
}
