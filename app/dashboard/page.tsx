import { AppLayout } from "@/components/layout/app-layout";
import { Feed } from "@/components/sessions/feed";
import { getFeedSessions } from "@/lib/actions/sessions";
import { getCurrentUser } from "@/lib/actions/auth";
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
                className="min-w-[180px] bg-card rounded-md shadow-lg border p-1 z-50"
                sideOffset={5}
                align="end"
              >
                <DropdownMenu.Item asChild>
                  <Link
                    href="/session/new"
                    className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded outline-none"
                  >
                    <Clock className="w-4 h-4" />
                    Record Session
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Item asChild>
                  <Link
                    href="/session/manual"
                    className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded outline-none"
                  >
                    <Edit3 className="w-4 h-4" />
                    Manual Entry
                  </Link>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Feed */}
        <Feed sessions={sessions} currentUserId={user.id} emptyContext="feed" />
      </div>
    </AppLayout>
  );
}
