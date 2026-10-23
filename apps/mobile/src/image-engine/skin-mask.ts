export interface Point { x: number; y: number }

function assertMask(mask: Uint8Array | Float32Array, width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || mask.length !== width * height) {
    throw new Error("Invalid skin mask dimensions");
  }
}

/** MediaPipe SelfieMulticlass: background, hair, body-skin, face-skin, clothes, accessories. */
export function skinMaskFromConfidence(scores: Float32Array[], width: number, height: number): Uint8Array {
  if (scores.length !== 6) throw new Error("Unexpected skin model categories");
  for (const score of scores) assertMask(score, width, height);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i += 1) {
    const body = scores[2]![i]!;
    const face = scores[3]![i]!;
    const excluded = Math.max(scores[0]![i]!, scores[1]![i]!, scores[4]![i]!, scores[5]![i]!);
    // A combined skin probability must never override a winning hair/clothes class.
    if (Math.max(body, face) <= excluded) continue;
    const probability = body + face;
    if (!Number.isFinite(probability) || probability <= 0.55) continue;
    mask[i] = Math.round(Math.min(1, (probability - 0.55) / 0.35) * 255);
  }
  return mask;
}

/** Feather only inward: excluded background, clothing and holes remain exactly zero. */
export function featherInside(mask: Uint8Array, width: number, height: number): Uint8Array {
  assertMask(mask, width, height);
  const result = new Uint8Array(mask);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (mask[i] === 0) continue;
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            sum += mask[ny * width + nx]!;
            count += 1;
          }
        }
      }
      result[i] = Math.min(mask[i]!, Math.round(sum / count));
    }
  }
  return result;
}

export function resizeMask(mask: Uint8Array, width: number, height: number, nextWidth: number, nextHeight: number): Uint8Array {
  assertMask(mask, width, height);
  if (!Number.isInteger(nextWidth) || !Number.isInteger(nextHeight) || nextWidth < 1 || nextHeight < 1) {
    throw new Error("Invalid export dimensions");
  }
  const result = new Uint8Array(nextWidth * nextHeight);
  for (let y = 0; y < nextHeight; y += 1) {
    const sy = Math.max(0, Math.min(height - 1, (y + 0.5) * height / nextHeight - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < nextWidth; x += 1) {
      const sx = Math.max(0, Math.min(width - 1, (x + 0.5) * width / nextWidth - 0.5));
      if (mask[Math.round(sy) * width + Math.round(sx)] === 0) continue;
      const x0 = Math.floor(sx);
      const x1 = Math.min(width - 1, x0 + 1);
      const fx = sx - x0;
      const top = mask[y0 * width + x0]! * (1 - fx) + mask[y0 * width + x1]! * fx;
      const bottom = mask[y1 * width + x0]! * (1 - fx) + mask[y1 * width + x1]! * fx;
      result[y * nextWidth + x] = Math.round(top * (1 - fy) + bottom * fy);
    }
  }
  return result;
}

export function paintMaskStroke(
  mask: Uint8Array, width: number, height: number, from: Point, to: Point,
  radius: number, mode: "add" | "remove",
): void {
  assertMask(mask, width, height);
  if (![from.x, from.y, to.x, to.y, radius].every(Number.isFinite) || radius <= 0) return;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  for (let y = Math.max(0, Math.floor(Math.min(from.y, to.y) - radius)); y <= Math.min(height - 1, Math.ceil(Math.max(from.y, to.y) + radius)); y += 1) {
    for (let x = Math.max(0, Math.floor(Math.min(from.x, to.x) - radius)); x <= Math.min(width - 1, Math.ceil(Math.max(from.x, to.x) + radius)); x += 1) {
      const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / lengthSquared));
      const distance = Math.hypot(x - from.x - t * dx, y - from.y - t * dy);
      const strength = Math.max(0, Math.min(1, (radius - distance) / Math.max(1, radius * 0.25)));
      const i = y * width + x;
      mask[i] = mode === "add"
        ? Math.max(mask[i]!, Math.round(255 * strength))
        : Math.min(mask[i]!, Math.round(255 * (1 - strength)));
    }
  }
}

export function excludePolygons(mask: Uint8Array, width: number, height: number, polygons: Point[][]): void {
  assertMask(mask, width, height);
  for (const polygon of polygons) {
    if (polygon.length < 3 || polygon.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) continue;
    const minX = Math.max(0, Math.floor(Math.min(...polygon.map(point => point.x))));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(...polygon.map(point => point.x))));
    const minY = Math.max(0, Math.floor(Math.min(...polygon.map(point => point.y))));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(...polygon.map(point => point.y))));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
          const a = polygon[i]!;
          const b = polygon[j]!;
          if ((a.y > y + 0.5) !== (b.y > y + 0.5) &&
            x + 0.5 < (b.x - a.x) * (y + 0.5 - a.y) / (b.y - a.y) + a.x) inside = !inside;
        }
        if (inside) mask[y * width + x] = 0;
      }
    }
  }
}
