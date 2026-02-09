import { AppLayout } from "@/components/layout/app-layout";
import { Feed } from "@/components/sessions/feed";
import { getFeedSessions } from "@/lib/actions/sessions";
import { getCurrentUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const sessions = await getFeedSessions(50);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Feed</h1>
            <p className="text-muted-foreground mt-1">
              See what you and your friends are practicing
            </p>
          </div>

          <Button asChild className="gap-2">
            <Link href="/session/new">
              <Plus className="w-4 h-4" />
              Log Practice
            </Link>
          </Button>
        </div>

        {/* Feed */}
        <Feed sessions={sessions} currentUserId={user.id} />
      </div>
    </AppLayout>
  );
}
