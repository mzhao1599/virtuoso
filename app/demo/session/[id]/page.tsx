import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SessionCard } from "@/components/sessions/session-card";
import { CommentThread } from "@/components/sessions/comment-thread";
import { Card, CardContent } from "@/components/ui/card";
import { getDemoSession } from "@/lib/demo/data";
import { ArrowLeft } from "lucide-react";

export const revalidate = 300;

// Render each demo session on first request, then serve it from the cache.
export async function generateStaticParams() {
  return [];
}

const loadSession = cache(getDemoSession);

interface DemoSessionPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DemoSessionPageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await loadSession(id);
  if (!detail) return { title: "Session not found · Demo · Virtuoso" };
  const who = detail.session.profile.display_name || detail.session.profile.username;
  return { title: `${who}'s practice · Demo · Virtuoso` };
}

export default async function DemoSessionPage({ params }: DemoSessionPageProps) {
  const { id } = await params;
  const detail = await loadSession(id);
  if (!detail) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/demo"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to the demo feed
      </Link>

      <SessionCard session={detail.session} />

      <Card>
        <CardContent className="pt-6">
          <CommentThread sessionId={detail.session.id} initialComments={detail.comments} currentUserId={null} />
        </CardContent>
      </Card>
    </div>
  );
}
