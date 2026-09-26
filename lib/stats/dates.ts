/**
 * Calendar-day helpers in the runtime's local time zone. In the browser that
 * is the viewer's zone, which is how the practice calendar groups sessions,
 * so streaks and weekly totals computed with these match the calendar.
 */

/** `YYYY-MM-DD` for the local calendar day containing `date`. */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Local midnight at the start of `date`'s day. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Shift by whole calendar days (DST-safe: a day may be 23 or 25 hours). */
export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Local midnight at the start of the week containing `date` (0 = Sunday). */
export function startOfLocalWeek(date: Date, weekStartsOn = 0): Date {
  const start = startOfLocalDay(date);
  const offset = (start.getDay() - weekStartsOn + 7) % 7;
  return addLocalDays(start, -offset);
}
