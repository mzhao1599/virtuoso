"use client";

import { useIsClient } from "@/hooks/useIsClient";
import { formatRelativeTime } from "@/lib/utils";

/**
 * A timestamp in the viewer's time zone. Pages are rendered on a server in
 * UTC, so the formatted text is only filled in after hydration; before that
 * the element is empty (the machine-readable dateTime is always present).
 */
export function LocalTime({ date, className }: { date: string; className?: string }) {
  const isClient = useIsClient();
  return (
    <time dateTime={date} className={className}>
      {isClient ? formatRelativeTime(date) : ""}
    </time>
  );
}
