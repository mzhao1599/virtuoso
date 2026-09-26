import { AppLayout } from "@/components/layout/app-layout";
import { Feed } from "@/components/sessions/feed";
import { getFeedSessions } from "@/lib/actions/sessions";
import { getCurrentUser } from "@/lib/actions/auth";
import { getPracticeHistory } from "@/lib/actions/profile";
import { WeeklySummary } from "@/components/dashboard/weekly-summary";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Clock, Edit3 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your Feed</h1>
            <p className="text-sm text-muted-foreground mt-1">
              See what you and your friends are practicing
            </p>
          </div>

          {/* Log Practice Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Log Practice
              </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[200px] bg-white rounded-xl shadow-card-hover border border-border/50 p-1.5 z-50 animate-fade-in"
                sideOffset={8}
                align="end"
              >
                <DropdownMenu.Item asChild>
                  <Link
                    href="/session/new"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-accent rounded-lg outline-none transition-colors"
                  >
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Record Session
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Item asChild>
                  <Link
                    href="/session/manual"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-accent rounded-lg outline-none transition-colors"
                  >
                    <Edit3 className="w-4 h-4 text-muted-foreground" />
                    Manual Entry
                  </Link>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
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
