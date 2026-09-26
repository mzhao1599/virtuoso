import { describe, expect, it } from "vitest";
import { goalProgress, parseWeeklyGoalHours, weeklyTotals } from "@/lib/stats/weekly";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const HOUR = 3600;

describe("goalProgress", () => {
  // Wed Mar 11 2026: Sun=0 ... Wed=3, so 4 days of the week have started
  const wednesday = at(2026, 3, 11);

  it("reports percent, remaining time and days left", () => {
    const p = goalProgress(2 * HOUR, 300, wednesday);
    expect(p.goalSeconds).toBe(5 * HOUR);
    expect(p.percent).toBeCloseTo(40);
    expect(p.remainingSeconds).toBe(3 * HOUR);
    expect(p.daysLeft).toBe(4); // Wed, Thu, Fri, Sat
    expect(p.perDaySeconds).toBe(Math.ceil((3 * HOUR) / 4));
    expect(p.met).toBe(false);
  });

  it("is on pace when practice keeps up with an even split of the goal", () => {
    // by the end of Wednesday an even pace is 4/7 of 7 h = 4 h
    expect(goalProgress(4 * HOUR, 7 * 60, wednesday).onPace).toBe(true);
    expect(goalProgress(4 * HOUR - 1, 7 * 60, wednesday).onPace).toBe(false);
  });

  it("caps percent at 100 and needs nothing more once met", () => {
    const p = goalProgress(6 * HOUR, 300, wednesday);
    expect(p.met).toBe(true);
    expect(p.percent).toBe(100);
    expect(p.remainingSeconds).toBe(0);
    expect(p.perDaySeconds).toBe(0);
  });

  it("puts all remaining time on the last day of the week", () => {
    const saturday = at(2026, 3, 14);
    const p = goalProgress(HOUR, 120, saturday);
    expect(p.daysLeft).toBe(1);
    expect(p.perDaySeconds).toBe(HOUR);
  });

  it("supports weeks that start on Monday", () => {
    expect(goalProgress(0, 60, at(2026, 3, 9), 1).daysLeft).toBe(7); // Monday
    expect(goalProgress(0, 60, at(2026, 3, 8), 1).daysLeft).toBe(1); // Sunday
  });

  it("treats negative input as zero", () => {
    const p = goalProgress(-50, 60, wednesday);
    expect(p.percent).toBe(0);
    expect(p.remainingSeconds).toBe(HOUR);
  });
});

describe("weeklyTotals", () => {
  it("buckets sessions into local weeks, oldest first", () => {
    const now = at(2026, 3, 11);
    const weeks = weeklyTotals(
      [
        { created_at: at(2026, 3, 11, 8), duration_seconds: 1800 },
        { created_at: at(2026, 3, 8, 0), duration_seconds: 600 }, // Sunday: this week
        { created_at: at(2026, 3, 7, 23), duration_seconds: 900 }, // Saturday: last week
        { created_at: at(2026, 3, 7, 10), duration_seconds: 300 },
        { created_at: at(2026, 1, 1), duration_seconds: 9999 }, // outside the range
        { created_at: at(2026, 3, 20), duration_seconds: 9999 }, // in the future
      ],
      now,
      3
    );
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-02-22", "2026-03-01", "2026-03-08"]);
    expect(weeks[2]).toEqual({ weekStart: "2026-03-08", seconds: 2400, sessions: 2, days: 2 });
    expect(weeks[1]).toEqual({ weekStart: "2026-03-01", seconds: 1200, sessions: 2, days: 1 });
    expect(weeks[0].seconds).toBe(0);
  });
});

describe("parseWeeklyGoalHours", () => {
  it("converts hours to whole minutes", () => {
    expect(parseWeeklyGoalHours("5")).toBe(300);
    expect(parseWeeklyGoalHours("2.5")).toBe(150);
    expect(parseWeeklyGoalHours(" 0.25 ")).toBe(15);
  });

  it("treats empty or zero as no goal", () => {
    expect(parseWeeklyGoalHours("")).toBeNull();
    expect(parseWeeklyGoalHours("0")).toBeNull();
    expect(parseWeeklyGoalHours(null)).toBeNull();
  });

  it("rejects values outside 1 minute to 168 hours, and non-numbers", () => {
    expect(() => parseWeeklyGoalHours("169")).toThrow();
    expect(() => parseWeeklyGoalHours("0.001")).toThrow();
    expect(() => parseWeeklyGoalHours("-2")).toThrow();
    expect(() => parseWeeklyGoalHours("1e3")).toThrow();
    expect(() => parseWeeklyGoalHours("five")).toThrow();
  });
});
