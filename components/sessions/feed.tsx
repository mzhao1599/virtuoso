"use client";

import { SessionCard } from "@/components/sessions/session-card";
import { toggleKudo } from "@/lib/actions/sessions";
import type { FeedSession } from "@/src/types";
import { useRouter } from "next/navigation";

interface FeedProps {
  sessions: FeedSession[];
  currentUserId?: string;
  emptyContext?: "feed" | "own-profile" | "other-profile";
}

export function Feed({ sessions, currentUserId, emptyContext = "feed" }: FeedProps) {
  const router = useRouter();

  const handleKudo = async (sessionId: string) => {
    try {
      await toggleKudo(sessionId);
      router.refresh();
    } catch (error) {
      console.error("Error toggling kudo:", error);
    }
  };

  const handleComment = (sessionId: string) => {
    // TODO: Open comment dialog
    console.log("Comment on session:", sessionId);
  };

  if (sessions.length === 0) {
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
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          currentUserId={currentUserId}
          onKudo={handleKudo}
          onComment={handleComment}
        />
      ))}
    </div>
  );
}
