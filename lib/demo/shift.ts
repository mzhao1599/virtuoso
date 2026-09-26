const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The demo data is seeded once, so it would slowly age. The /demo pages
 * move every demo timestamp forward by whole days so the most recent
 * session falls within the last 24 hours; the gaps between sessions, and
 * each session's time of day, stay as seeded. Never shifts into the future.
 */
export function demoShiftMs(latestIso: string | null | undefined, now: Date): number {
  if (!latestIso) return 0;
  const latest = Date.parse(latestIso);
  if (Number.isNaN(latest) || latest > now.getTime()) return 0;
  return Math.floor((now.getTime() - latest) / DAY_MS) * DAY_MS;
}

export function shiftIso(iso: string, shiftMs: number): string {
  return shiftMs === 0 ? iso : new Date(Date.parse(iso) + shiftMs).toISOString();
}
