import { Navbar } from "@/components/layout/navbar";
import { getCurrentUser } from "@/lib/actions/auth";
import { getPendingFollowRequestCount } from "@/lib/actions/profile";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export async function AppLayout({ children }: AppLayoutProps) {
  const user = await getCurrentUser();

  const [pendingRequestsCount, unreadCount] = user
    ? await Promise.all([getPendingFollowRequestCount(), getUnreadNotificationCount()])
    : [0, 0];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} pendingRequestsCount={pendingRequestsCount} unreadCount={unreadCount} />
      {/* Leave room for the mobile tab bar */}
      <main id="main" className={cn("flex-1", user && "pb-20 md:pb-0")}>
        {children}
      </main>
    </div>
  );
}
