"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useIsClient } from "@/hooks/useIsClient";
import { goalProgress, weeklyTotals, type WeekTotal } from "@/lib/stats/weekly";
import { formatHoursMinutes } from "@/lib/utils";
import type { PracticeHistoryEntry } from "@/src/types";
import { Check, Target } from "lucide-react";

const WEEKS = 8;

interface WeeklySummaryProps {
  /** Sessions from at least the last WEEKS weeks */
  entries: PracticeHistoryEntry[];
  goalMinutes: number | null;
  /** Link for setting the goal; omit to hide the prompt (demo) */
  goalHref?: string;
  title?: string;
}

/**
 * This week's practice (local Sunday–Saturday), progress toward the optional
 * weekly goal, and the last 8 weeks as bars. Computed in the browser so weeks
 * follow the viewer's time zone, like the calendar.
 */
export function WeeklySummary({ entries, goalMinutes, goalHref, title = "This week" }: WeeklySummaryProps) {
  const isClient = useIsClient();
  const view = useMemo(() => {
    if (!isClient) return null;
    const now = new Date();
    const weeks = weeklyTotals(entries, now, WEEKS);
    const current = weeks[weeks.length - 1];
    return {
      weeks,
      current,
      goal: goalMinutes ? goalProgress(current.seconds, goalMinutes, now) : null,
    };
  }, [isClient, entries, goalMinutes]);

  return (
    <Card>
      <CardContent className="pt-6">
        {view ? (
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <ThisWeek title={title} week={view.current} goal={view.goal} goalHref={goalHref} />
            <WeekBars weeks={view.weeks} goalSeconds={view.goal?.goalSeconds ?? null} />
          </div>
        ) : (
          // Same footprint as the loaded state, so nothing jumps
          <div className="h-[132px] animate-pulse rounded-xl bg-muted/50" aria-hidden="true" />
        )}
      </CardContent>
    </Card>
  );
}

function ThisWeek({
  title,
  week,
  goal,
  goalHref,
}: {
  title: string;
  week: WeekTotal;
  goal: ReturnType<typeof goalProgress> | null;
  goalHref?: string;
}) {
  return (
    <div className="min-w-0">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h2>
      <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{formatHoursMinutes(week.seconds)}</p>
      <p className="text-sm text-muted-foreground">
        {week.sessions} {week.sessions === 1 ? "session" : "sessions"} · {week.days} of 7 days
      </p>

      {goal ? (
        <div className="mt-4 max-w-sm">
          <div className="flex items-baseline justify-between text-xs mb-1.5">
            <span className="font-medium">
              {goal.met ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" /> Goal reached
                </span>
              ) : (
                <>{formatHoursMinutes(goal.remainingSeconds)} to go</>
              )}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {Math.floor(goal.percent)}% of {formatHoursMinutes(goal.goalSeconds)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Weekly goal progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(goal.percent)}
            className="h-2 rounded-full bg-muted overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${goal.met ? "bg-emerald-500" : "bg-primary"}`}
              style={{ width: `${goal.percent}%` }}
            />
          </div>
          {!goal.met && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              About {formatHoursMinutes(goal.perDaySeconds)} a day for the {goal.daysLeft === 1 ? "rest of today" : `next ${goal.daysLeft} days`}
              {goal.onPace ? " · on pace" : ""}
            </p>
          )}
        </div>
      ) : (
        goalHref && (
          <Link
            href={goalHref}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Target className="w-4 h-4" aria-hidden="true" /> Set a weekly goal
          </Link>
        )
      )}
    </div>
  );
}

function weekLabel(weekStart: string) {
  const [y, m, d] = weekStart.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Single-series bar chart: one bar per week, current week emphasized. */
function WeekBars({ weeks, goalSeconds }: { weeks: WeekTotal[]; goalSeconds: number | null }) {
  const max = Math.max(goalSeconds ?? 0, ...weeks.map((w) => w.seconds), 60);
  const goalPct = goalSeconds ? (goalSeconds / max) * 100 : null;

  return (
    <figure className="w-full sm:w-64">
      <figcaption className="sr-only">Practice time per week, last {weeks.length} weeks</figcaption>
      <div className="relative h-24 flex items-end gap-[2px]" aria-hidden="true">
        {goalPct !== null && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-muted-foreground/40 pointer-events-none"
            style={{ bottom: `${goalPct}%` }}
          />
        )}
        {weeks.map((w, i) => {
          const isCurrent = i === weeks.length - 1;
          const h = w.seconds > 0 ? Math.max(4, (w.seconds / max) * 100) : 0;
          return (
            <div key={w.weekStart} className="group relative flex-1 h-full flex items-end">
              <div
                className={`w-full rounded-t-[4px] transition-colors ${isCurrent ? "bg-primary" : "bg-primary/35 group-hover:bg-primary/55"}`}
                style={{ height: `${h}%` }}
              />
              {w.seconds === 0 && <div className="absolute bottom-0 inset-x-0 h-px bg-border" />}
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-background opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {isCurrent ? "This week" : `Week of ${weekLabel(w.weekStart)}`}: {formatHoursMinutes(w.seconds)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground" aria-hidden="true">
        <span>{weekLabel(weeks[0].weekStart)}</span>
        <span>This week</span>
      </div>
      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">Week starting</th>
            <th scope="col">Practice</th>
            <th scope="col">Sessions</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.weekStart}>
              <td>{weekLabel(w.weekStart)}</td>
              <td>{formatHoursMinutes(w.seconds)}</td>
              <td>{w.sessions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
