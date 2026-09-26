import { Navbar } from "@/components/layout/navbar";
import { getCurrentUser } from "@/lib/actions/auth";
import { getPendingFollowRequestCount } from "@/lib/actions/profile";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";

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
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
