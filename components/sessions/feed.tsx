"use client";

import { SessionCard } from "@/components/sessions/session-card";
import { toggleKudo } from "@/lib/actions/sessions";
import type { FeedSession } from "@/src/types";
import { useRouter } from "next/navigation";

interface FeedProps {
  sessions: FeedSession[];
  currentUserId?: string;
}

export function Feed({ sessions, currentUserId }: FeedProps) {
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
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          No practice sessions yet. Start by logging your first session!
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
