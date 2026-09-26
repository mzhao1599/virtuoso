"use client";

import { useMemo } from "react";
import { computeStreak } from "@/lib/stats/streak";
import { useIsClient } from "@/hooks/useIsClient";

/** Current streak, counted in the viewer's local days like the calendar. */
export function StreakValue({ timestamps }: { timestamps: string[] }) {
  const isClient = useIsClient();
  const streak = useMemo(() => (isClient ? computeStreak(timestamps) : null), [isClient, timestamps]);

  if (streak === null) return <span aria-hidden="true">–</span>;
  return <>{`${streak} ${streak === 1 ? "day" : "days"}`}</>;
}
