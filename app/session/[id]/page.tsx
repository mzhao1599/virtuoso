import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { SessionCard } from "@/components/sessions/session-card";
import { CommentThread } from "@/components/sessions/comment-thread";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/actions/auth";
import { getSessionComments, getSessionDetail } from "@/lib/actions/sessions";
import { ArrowLeft } from "lucide-react";

// generateMetadata and the page share one fetch per request
const loadSession = cache(getSessionDetail);

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SessionPageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await loadSession(id);
  if (!session) return { title: "Session not found · Virtuoso" };
  const who = session.profile.display_name || session.profile.username;
  const what = session.piece_name ? `: ${session.piece_name}` : "";
  return { title: `${who}'s ${session.instrument.toLowerCase()} practice${what} · Virtuoso` };
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;

  const [session, currentUser] = await Promise.all([loadSession(id), getCurrentUser()]);
  if (!session) {
    // Missing, or private and the viewer is not an accepted follower
    notFound();
  }

  const comments = await getSessionComments(session.id);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Link
          href={currentUser ? "/dashboard" : `/profile/${session.profile.username}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {currentUser ? "Back to feed" : `More from ${session.profile.display_name || session.profile.username}`}
        </Link>

        <SessionCard session={session} currentUserId={currentUser?.id} />

        <Card>
          <CardContent className="pt-6">
            <CommentThread
              sessionId={session.id}
              initialComments={comments}
              currentUserId={currentUser?.id ?? null}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
