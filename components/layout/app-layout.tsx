import { Navbar } from "@/components/layout/navbar";
import { getCurrentUser } from "@/lib/actions/auth";
import { getPendingFollowRequests } from "@/lib/actions/profile";

interface AppLayoutProps {
  children: React.ReactNode;
}

export async function AppLayout({ children }: AppLayoutProps) {
  const user = await getCurrentUser();
  
  // Get pending follow requests count if user is logged in
  let pendingRequestsCount = 0;
  if (user) {
    const requests = await getPendingFollowRequests();
    pendingRequestsCount = requests.length;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} pendingRequestsCount={pendingRequestsCount} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
