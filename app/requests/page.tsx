import { AppLayout } from "@/components/layout/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPendingFollowRequests, acceptFollowRequest, rejectFollowRequest } from "@/lib/actions/profile";
import { getAvatarInitials } from "@/lib/utils/avatar";
import { Music, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { revalidatePath } from "next/cache";

export default async function RequestsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const requests = await getPendingFollowRequests();

  async function handleAccept(userId: string) {
    "use server";
    await acceptFollowRequest(userId);
    revalidatePath("/requests");
  }

  async function handleReject(userId: string) {
    "use server";
    await rejectFollowRequest(userId);
    revalidatePath("/requests");
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl tracking-tight">Follow Requests</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {requests.length} pending {requests.length === 1 ? "request" : "requests"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No pending follow requests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map((requester) => (
                  <div
                    key={requester.id}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent/50 transition-colors"
                  >
                    <Link href={`/profile/${requester.username}`}>
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={requester.avatar_url || undefined}
                          alt={requester.username}
                        />
                        <AvatarFallback>
                          {getAvatarInitials(requester.display_name, requester.username)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/profile/${requester.username}`}
                        className="font-medium text-sm truncate hover:underline block"
                      >
                        {requester.display_name || requester.username}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        @{requester.username}
                      </p>
                      {requester.primary_instrument && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Music className="w-3 h-3" />
                          <span>{requester.primary_instrument}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <form action={handleAccept.bind(null, requester.id)}>
                        <Button type="submit" size="sm">
                          Accept
                        </Button>
                      </form>
                      <form action={handleReject.bind(null, requester.id)}>
                        <Button type="submit" size="sm" variant="outline">
                          Reject
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
