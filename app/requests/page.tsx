import { AppLayout } from "@/components/layout/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPendingFollowRequests, acceptFollowRequest, rejectFollowRequest } from "@/lib/actions/profile";
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
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Follow Requests
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {requests.length} pending {requests.length === 1 ? "request" : "requests"}
            </p>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending follow requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((requester) => (
                  <div
                    key={requester.id}
                    className="flex items-center gap-4 p-3 rounded-lg border"
                  >
                    <Link href={`/profile/${requester.username}`}>
                      <Avatar className="w-12 h-12">
                        <AvatarImage
                          src={requester.avatar_url || undefined}
                          alt={requester.username}
                        />
                        <AvatarFallback>
                          {requester.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/profile/${requester.username}`}
                        className="font-semibold truncate hover:underline block"
                      >
                        {requester.display_name || requester.username}
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        @{requester.username}
                      </p>
                      {requester.primary_instrument && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Music className="w-3 h-3" />
                          <span>{requester.primary_instrument}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <form action={handleAccept.bind(null, requester.id)}>
                        <Button type="submit" size="sm" variant="default">
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
