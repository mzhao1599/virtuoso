import { AppLayout } from "@/components/layout/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfileByUsername, getFollowing } from "@/lib/actions/profile";
import { getAvatarInitials } from "@/lib/utils/avatar";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Music } from "lucide-react";

interface FollowingPageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function FollowingPage({ params }: FollowingPageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const following = await getFollowing(profile.id);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {profile.display_name || profile.username} is Following
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {following.length} {following.length === 1 ? "user" : "users"}
            </p>
          </CardHeader>
          <CardContent>
            {following.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Not following anyone yet
              </p>
            ) : (
              <div className="space-y-4">
                {following.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.username}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={user.avatar_url || undefined}
                        alt={user.username}
                      />
                      <AvatarFallback>
                        {getAvatarInitials(user.display_name, user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {user.display_name || user.username}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{user.username}
                      </p>
                      {user.primary_instrument && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Music className="w-3 h-3" />
                          <span>{user.primary_instrument}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
