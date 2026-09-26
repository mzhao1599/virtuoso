import { addLocalDays, localDateKey, startOfLocalDay } from "./dates";

/**
 * Current practice streak: the number of consecutive local calendar days with
 * at least one session, ending today, or yesterday if today has none yet
 * (so the streak survives until the day is over). Returns 0 otherwise.
 */
export function computeStreak(timestamps: ReadonlyArray<string | Date>, now: Date = new Date()): number {
  if (timestamps.length === 0) return 0;

  const practiceDays = new Set(timestamps.map((t) => localDateKey(new Date(t))));

  let cursor = startOfLocalDay(now);
  if (!practiceDays.has(localDateKey(cursor))) {
    cursor = addLocalDays(cursor, -1);
  }

  let streak = 0;
  while (practiceDays.has(localDateKey(cursor))) {
    streak++;
    cursor = addLocalDays(cursor, -1);
  }
  return streak;
}
