import { addLocalDays, localDateKey, startOfLocalWeek } from "./dates";

export interface WeekTotal {
  /** `YYYY-MM-DD` of the week's first local day */
  weekStart: string;
  seconds: number;
  sessions: number;
  /** Distinct local days with at least one session */
  days: number;
}

/**
 * Practice totals for the last `weeks` local calendar weeks, oldest first;
 * the last entry is the week containing `now`. Sessions outside the range
 * are ignored.
 */
export function weeklyTotals(
  entries: ReadonlyArray<{ created_at: string | Date; duration_seconds: number }>,
  now: Date = new Date(),
  weeks = 8,
  weekStartsOn = 0
): WeekTotal[] {
  const currentWeekStart = startOfLocalWeek(now, weekStartsOn);
  const starts: Date[] = [];
  for (let i = weeks - 1; i >= 0; i--) starts.push(addLocalDays(currentWeekStart, -7 * i));

  const totals = starts.map((start) => ({
    weekStart: localDateKey(start),
    seconds: 0,
    sessions: 0,
    dayKeys: new Set<string>(),
  }));
  const index = new Map(totals.map((t, i) => [t.weekStart, i]));
  const rangeEnd = addLocalDays(currentWeekStart, 7);

  for (const entry of entries) {
    const at = new Date(entry.created_at);
    if (at < starts[0] || at >= rangeEnd) continue;
    const i = index.get(localDateKey(startOfLocalWeek(at, weekStartsOn)));
    if (i === undefined) continue;
    totals[i].seconds += Math.max(0, entry.duration_seconds);
    totals[i].sessions += 1;
    totals[i].dayKeys.add(localDateKey(at));
  }

  return totals.map(({ dayKeys, ...t }) => ({ ...t, days: dayKeys.size }));
}

/** Weekly goal bounds, in minutes (a week has 10,080). */
export const WEEKLY_GOAL_MIN_MINUTES = 1;
export const WEEKLY_GOAL_MAX_MINUTES = 7 * 24 * 60;

export interface GoalProgress {
  goalSeconds: number;
  /** 0–100, for the progress bar */
  percent: number;
  met: boolean;
  remainingSeconds: number;
  /** Days left in the week including today (1–7) */
  daysLeft: number;
  /** Practice per remaining day needed to reach the goal (0 once met) */
  perDaySeconds: number;
  /** Whether practice so far keeps up with an even pace through the week */
  onPace: boolean;
}

/**
 * Progress toward a weekly goal given this week's practice so far.
 * `now` decides how much of the week has passed (for pace and days left).
 */
export function goalProgress(
  practicedSeconds: number,
  goalMinutes: number,
  now: Date = new Date(),
  weekStartsOn = 0
): GoalProgress {
  const goalSeconds = Math.max(0, Math.round(goalMinutes * 60));
  const practiced = Math.max(0, practicedSeconds);
  const met = goalSeconds > 0 && practiced >= goalSeconds;
  const remainingSeconds = Math.max(0, goalSeconds - practiced);

  const dayIndex = (now.getDay() - weekStartsOn + 7) % 7; // 0 = first day of the week
  const daysLeft = 7 - dayIndex;
  // Even pace: by the end of today you'd have done (dayIndex + 1)/7 of the goal.
  const expectedByToday = (goalSeconds * (dayIndex + 1)) / 7;

  return {
    goalSeconds,
    percent: goalSeconds > 0 ? Math.min(100, (practiced / goalSeconds) * 100) : 0,
    met,
    remainingSeconds,
    daysLeft,
    perDaySeconds: met ? 0 : Math.ceil(remainingSeconds / daysLeft),
    onPace: practiced >= expectedByToday,
  };
}

/**
 * Parse the settings form's weekly goal (hours, may be fractional) into
 * whole minutes. Empty means "no goal" (null). Throws on invalid input.
 */
export function parseWeeklyGoalHours(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const text = String(input).trim();
  if (text === "" || text === "0") return null;
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error("Enter the goal as a number of hours");
  const minutes = Math.round(Number(text) * 60);
  if (minutes < WEEKLY_GOAL_MIN_MINUTES || minutes > WEEKLY_GOAL_MAX_MINUTES) {
    throw new Error("The weekly goal must be between 1 minute and 168 hours");
  }
  return minutes;
}
