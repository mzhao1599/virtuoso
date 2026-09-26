import { AppLayout } from "@/components/layout/app-layout";
import { Feed } from "@/components/sessions/feed";
import { getFeedSessions } from "@/lib/actions/sessions";
import { getCurrentUser } from "@/lib/actions/auth";
import { getPracticeHistory } from "@/lib/actions/profile";
import { WeeklySummary } from "@/components/dashboard/weekly-summary";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock, Edit3 } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [feedPage, recent] = await Promise.all([
    getFeedSessions(),
    // 8 weeks for the weekly chart, plus a day of slack for time zones
    getPracticeHistory(user.id, { sinceDays: 8 * 7 + 1 }),
  ]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <p className="eyebrow">Hi, {user.display_name?.split(" ")[0] || user.username}</p>
            <h1 className="font-serif text-4xl mt-1">Your feed</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild className="gap-2">
              <Link href="/session/new">
                <Clock className="w-4 h-4" aria-hidden="true" />
                Start the timer
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/session/manual">
                <Edit3 className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Add a past session</span>
                <span className="sm:hidden">Add past</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <WeeklySummary entries={recent} goalMinutes={user.weekly_goal_minutes} goalHref="/settings#weekly-goal" />
        </div>

        {/* Feed */}
        <Feed initialPage={feedPage} loadMore={getFeedSessions} currentUserId={user.id} emptyContext="feed" />
      </div>
    </AppLayout>
  );
}
