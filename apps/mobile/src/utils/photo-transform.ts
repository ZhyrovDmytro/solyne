/** Matches centered CSS object-fit so brush coordinates stay on the visible pixels. */
export function photoTransform(
  image: { width: number; height: number },
  frame: { width: number; height: number },
  fit: "cover" | "contain",
) {
  const scale = (fit === "cover" ? Math.max : Math.min)(
    frame.width / image.width, frame.height / image.height,
  );
  return {
    scale,
    left: (frame.width - image.width * scale) / 2,
    top: (frame.height - image.height * scale) / 2,
  };
}
