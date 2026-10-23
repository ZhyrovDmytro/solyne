export function comparisonPosition(clientX: number, left: number, width: number): number {
  if (width <= 0) return 50;
  return Math.max(0, Math.min(100, (clientX - left) / width * 100));
}

export function comparisonIntro(progress: number): number {
  const stops = [50, 38, 62, 50];
  const segment = Math.min(2, Math.floor(Math.max(0, progress) * 3));
  const fraction = Math.min(1, Math.max(0, progress * 3 - segment));
  const eased = (1 - Math.cos(fraction * Math.PI)) / 2;
  return stops[segment]! + (stops[segment + 1]! - stops[segment]!) * eased;
}
