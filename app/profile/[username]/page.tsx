import { AppLayout } from "@/components/layout/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { getProfileByUsername, calculateStreak, getPracticeCalendarData } from "@/lib/actions/profile";
import { getUserSessions } from "@/lib/actions/sessions";
import { getCurrentUser } from "@/lib/actions/auth";
import { Feed } from "@/components/sessions/feed";
import { FollowButton } from "@/components/profile/follow-button";
import { PracticeCalendar } from "@/components/profile/practice-calendar";
import { notFound } from "next/navigation";
import { formatDuration } from "@/lib/utils";
import { getAvatarInitials } from "@/lib/utils/avatar";
import { Music, Calendar, Clock, Flame } from "lucide-react";
import Link from "next/link";

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const isOwnProfile = currentUser?.id === profile.id;

  const canViewSessions =
    isOwnProfile ||
    profile.account_type === 'public' ||
    profile.is_following;

  const sessions = canViewSessions ? await getUserSessions(profile.id, 20) : [];
  const currentStreak = canViewSessions ? await calculateStreak(profile.id) : 0;
  const calendarData = canViewSessions ? await getPracticeCalendarData(profile.id) : [];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar */}
              <Avatar className="w-20 h-20">
                <AvatarImage
                  src={profile.avatar_url || undefined}
                  alt={profile.username}
                />
                <AvatarFallback className="text-xl">
                  {getAvatarInitials(profile.display_name, profile.username)}
                </AvatarFallback>
              </Avatar>

              {/* Profile Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {profile.display_name || profile.username}
                  </h1>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                </div>

                {profile.bio && (
                  <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>
                )}

                {profile.primary_instrument && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
                    <Music className="w-3.5 h-3.5" />
                    <span className="font-medium">{profile.primary_instrument}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-5 text-sm">
                  <Link
                    href={`/profile/${profile.username}/followers`}
                    className="hover:underline"
                  >
                    <span className="font-semibold">{profile.followers_count}</span>{" "}
                    <span className="text-muted-foreground">followers</span>
                  </Link>
                  <Link
                    href={`/profile/${profile.username}/following`}
                    className="hover:underline"
                  >
                    <span className="font-semibold">{profile.following_count}</span>{" "}
                    <span className="text-muted-foreground">following</span>
                  </Link>
                </div>

                {/* Follow Button */}
                {!isOwnProfile && (
                  <FollowButton
                    userId={profile.id}
                    followStatus={profile.follow_status}
                    disabled={!currentUser}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {canViewSessions ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Calendar className="w-5 h-5 text-primary" />}
                label="Sessions"
                value={profile.stats.total_sessions.toString()}
              />
              <StatCard
                icon={<Clock className="w-5 h-5 text-primary" />}
                label="Total Time"
                value={formatDuration(profile.stats.total_seconds)}
              />
              <StatCard
                icon={<Flame className="w-5 h-5 text-amber-500" />}
                label="Current Streak"
                value={`${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`}
              />
              <StatCard
                icon={<Calendar className="w-5 h-5 text-primary" />}
                label="Practice Days"
                value={profile.stats.practice_days.toString()}
              />
            </div>

            {/* Practice Calendar */}
            <div className="mb-8">
              <PracticeCalendar practiceData={calendarData} />
            </div>

            {/* Recent Sessions */}
            <div>
              <h2 className="text-xl font-semibold mb-4 tracking-tight">Recent Sessions</h2>
              <Feed sessions={sessions} currentUserId={currentUser?.id} emptyContext={isOwnProfile ? "own-profile" : "other-profile"} />
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                This account is private. {profile.follow_status === 'pending' ? 'Your follow request is pending.' : 'Follow to see their practice sessions.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
            {icon}
          </div>
          <div className="text-xl font-bold tracking-tight">{value}</div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
