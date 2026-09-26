import { describe, expect, it } from "vitest";
import { computeStreak } from "@/lib/stats/streak";
import { addLocalDays, localDateKey, startOfLocalWeek } from "@/lib/stats/dates";

// All times are local (TZ=America/New_York, see vitest.config.mts)
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

describe("computeStreak", () => {
  const now = at(2026, 3, 10, 9);

  it("is 0 with no sessions", () => {
    expect(computeStreak([], now)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(computeStreak([at(2026, 3, 10, 7), at(2026, 3, 9), at(2026, 3, 8)], now)).toBe(3);
  });

  it("keeps a streak that ended yesterday alive until today is over", () => {
    expect(computeStreak([at(2026, 3, 9), at(2026, 3, 8)], now)).toBe(2);
  });

  it("is 0 when the last session was two days ago", () => {
    expect(computeStreak([at(2026, 3, 8), at(2026, 3, 7)], now)).toBe(0);
  });

  it("counts several sessions on one day once and stops at a gap", () => {
    const sessions = [at(2026, 3, 10, 6), at(2026, 3, 10, 20), at(2026, 3, 9), at(2026, 3, 7)];
    expect(computeStreak(sessions, now)).toBe(2);
  });

  it("uses the local date, not the UTC date", () => {
    // 11:30 pm on Mar 9 in New York is already Mar 10 in UTC. Locally that is
    // yesterday, so with a session today the streak is 2 (UTC would say 1).
    const lateLocal = at(2026, 3, 9, 23, 30);
    expect(lateLocal.toISOString().slice(0, 10)).toBe("2026-03-10");
    expect(computeStreak([at(2026, 3, 10, 8), lateLocal], now)).toBe(2);
  });

  it("accepts ISO strings (as they come from the database)", () => {
    const iso = [at(2026, 3, 10, 8).toISOString(), at(2026, 3, 9, 8).toISOString()];
    expect(computeStreak(iso, now)).toBe(2);
  });

  it("walks across the spring-forward DST change (a 23-hour day)", () => {
    // US DST starts Sun Mar 8 2026
    const days = [at(2026, 3, 9), at(2026, 3, 8, 1), at(2026, 3, 8, 23), at(2026, 3, 7), at(2026, 3, 6)];
    expect(computeStreak(days, at(2026, 3, 9, 18))).toBe(4);
  });
});

describe("date helpers", () => {
  it("formats local date keys", () => {
    expect(localDateKey(at(2026, 1, 5, 0, 1))).toBe("2026-01-05");
  });

  it("adds calendar days across DST", () => {
    expect(localDateKey(addLocalDays(at(2026, 3, 7, 0), 2))).toBe("2026-03-09");
    expect(localDateKey(addLocalDays(at(2026, 11, 2, 0), -1))).toBe("2026-11-01");
  });

  it("finds the start of the week (Sunday by default)", () => {
    expect(localDateKey(startOfLocalWeek(at(2026, 3, 12)))).toBe("2026-03-08");
    expect(localDateKey(startOfLocalWeek(at(2026, 3, 8, 0, 0)))).toBe("2026-03-08");
    expect(localDateKey(startOfLocalWeek(at(2026, 3, 12), 1))).toBe("2026-03-09");
  });
});
