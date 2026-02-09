import { AppLayout } from "@/components/layout/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfileByUsername, getFollowers } from "@/lib/actions/profile";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Music } from "lucide-react";

interface FollowersPageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function FollowersPage({ params }: FollowersPageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const followers = await getFollowers(profile.id);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {profile.display_name || profile.username}'s Followers
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {followers.length} {followers.length === 1 ? "follower" : "followers"}
            </p>
          </CardHeader>
          <CardContent>
            {followers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No followers yet
              </p>
            ) : (
              <div className="space-y-4">
                {followers.map((follower) => (
                  <Link
                    key={follower.id}
                    href={`/profile/${follower.username}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={follower.avatar_url || undefined}
                        alt={follower.username}
                      />
                      <AvatarFallback>
                        {follower.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {follower.display_name || follower.username}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{follower.username}
                      </p>
                      {follower.primary_instrument && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Music className="w-3 h-3" />
                          <span>{follower.primary_instrument}</span>
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
