function smoothRange(value: number, minimum: number, maximum: number, feather: number): number {
  if (value <= minimum - feather || value >= maximum + feather) return 0;
  if (value >= minimum && value <= maximum) return 1;
  return value < minimum
    ? (value - (minimum - feather)) / feather
    : ((maximum + feather) - value) / feather;
}

/**
 * Broad color-consistency score used only inside pixels selected by BodyPix.
 * It is deliberately permissive; it is not a standalone skin detector.
 */
export function skinColorConsistency(r: number, g: number, b: number): number {
  if (r < g * 0.96 || r < b * 0.96) return 0;

  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const chroma = maximum - minimum;
  const cb = 128 - (0.168736 * r) - (0.331264 * g) + (0.5 * b);
  const cr = 128 + (0.5 * r) - (0.418688 * g) - (0.081312 * b);

  const luminanceScore = smoothRange((r + g + b) / 3, 18, 248, 10);
  const chromaScore = smoothRange(chroma, 7, 210, 7);
  const cbScore = smoothRange(cb, 72, 145, 12);
  const crScore = smoothRange(cr, 132, 190, 8);
  const redBalance = smoothRange(r - Math.min(g, b), 2, 145, 8);

  return Math.max(0, Math.min(1,
    luminanceScore * chromaScore * cbScore * crScore * redBalance,
  ));
}
