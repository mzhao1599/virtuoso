"use client";

import { useState, useTransition } from "react";
import { SessionCard } from "@/components/sessions/session-card";
import { Button } from "@/components/ui/button";
import type { FeedPage } from "@/src/types";

interface FeedProps {
  initialPage: FeedPage;
  /** Server action returning the page after `cursor`; omit for a single page */
  loadMore?: (cursor: string) => Promise<FeedPage>;
  currentUserId?: string;
  emptyContext?: "feed" | "own-profile" | "other-profile";
}

export function Feed({ initialPage, loadMore, currentUserId, emptyContext = "feed" }: FeedProps) {
  const [page, setPage] = useState(initialPage);
  const [sourcePage, setSourcePage] = useState(initialPage);
  const [error, setError] = useState(false);
  const [isLoading, startLoading] = useTransition();

  // A server refresh hands us a new first page: start over from it.
  if (initialPage !== sourcePage) {
    setSourcePage(initialPage);
    setPage(initialPage);
  }

  const handleLoadMore = () => {
    if (!loadMore || !page.nextCursor) return;
    const cursor = page.nextCursor;
    setError(false);
    startLoading(async () => {
      try {
        const next = await loadMore(cursor);
        setPage((prev) => {
          const seen = new Set(prev.sessions.map((s) => s.id));
          return {
            sessions: [...prev.sessions, ...next.sessions.filter((s) => !seen.has(s.id))],
            nextCursor: next.nextCursor,
          };
        });
      } catch {
        setError(true);
      }
    });
  };

  if (page.sessions.length === 0) {
    let emptyMessage = "No practice sessions yet.";

    if (emptyContext === "feed") {
      emptyMessage = "No practice sessions yet. Start by logging your first session, and follow some accounts from the leaderboard!";
    } else if (emptyContext === "own-profile") {
      emptyMessage = "No practice sessions yet. Start by logging your first session!";
    }

    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {page.sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          currentUserId={currentUserId}
        />
      ))}

      <div className="pt-2 text-center" aria-live="polite">
        {page.nextCursor && loadMore ? (
          <Button variant="outline" onClick={handleLoadMore} disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? "Loading…" : "Load more"}
          </Button>
        ) : (
          page.sessions.length > 3 && (
            <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
          )
        )}
        {error && (
          <p className="mt-2 text-sm text-destructive">Couldn&apos;t load more sessions. Try again.</p>
        )}
      </div>
    </div>
  );
}
