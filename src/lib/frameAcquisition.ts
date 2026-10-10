export interface FramePlanLine {
  id: string;
  filter: string;
  paneNumber: number | null;
  exposure?: number | null;
}

/** Resolve within one participant's plan, never across participants. */
export function matchFrameAcquisition(
  lines: FramePlanLine[],
  filter: string | null,
  paneNumber: number | null,
  exposure: number | null,
): string | null {
  if (!filter) return null;
  let candidates = lines.filter((line) => line.filter === filter);
  // A simple contribution stays simple even when another member has a mosaic.
  const panels = new Set(lines.map((line) => line.paneNumber));
  if (panels.size > 1) {
    if (paneNumber == null) return null;
    candidates = candidates.filter((line) => line.paneNumber === paneNumber);
  }
  if (candidates.length <= 1 || exposure == null) return candidates[0]?.id ?? null;
  const exact = candidates.find((line) => line.exposure != null && Math.abs(line.exposure - exposure) < 0.5);
  if (exact) return exact.id;
  const withExposure = candidates.filter((line) => line.exposure != null);
  if (!withExposure.length) return candidates[0]?.id ?? null;
  return withExposure.reduce((best, line) =>
    Math.abs(Number(line.exposure) - exposure) < Math.abs(Number(best.exposure) - exposure) ? line : best,
  ).id;
}