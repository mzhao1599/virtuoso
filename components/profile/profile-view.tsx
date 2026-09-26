import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Feed } from "@/components/sessions/feed";
import { PracticeCalendar } from "@/components/profile/practice-calendar";
import { PieceTotals } from "@/components/profile/piece-totals";
import { StreakValue } from "@/components/profile/streak-stat";
import { WeeklySummary } from "@/components/dashboard/weekly-summary";
import { pieceTotals } from "@/lib/stats/pieces";
import { formatDuration } from "@/lib/utils";
import { getAvatarInitials } from "@/lib/utils/avatar";
import type { FeedPage, PracticeHistoryEntry, ProfileWithStats } from "@/src/types";
import { Calendar, Clock, Flame, Lock, Music } from "lucide-react";

interface ProfileViewProps {
  profile: ProfileWithStats;
  history: PracticeHistoryEntry[];
  sessionsPage: FeedPage;
  loadMoreSessions: (cursor: string) => Promise<FeedPage>;
  canViewSessions: boolean;
  isOwnProfile: boolean;
  currentUserId?: string;
  /** Follow / accept buttons next to the name */
  actions?: React.ReactNode;
  /** Link the follower counts to their lists (the demo has no list pages) */
  linkFollowLists?: boolean;
}

/** Profile header, stats, weekly totals, calendar, pieces and sessions. */
export function ProfileView({
  profile,
  history,
  sessionsPage,
  loadMoreSessions,
  canViewSessions,
  isOwnProfile,
  currentUserId,
  actions,
  linkFollowLists = true,
}: ProfileViewProps) {
  const followers = (
    <>
      <span className="font-semibold">{profile.followers_count}</span>{" "}
      <span className="text-muted-foreground">followers</span>
    </>
  );
  const following = (
    <>
      <span className="font-semibold">{profile.following_count}</span>{" "}
      <span className="text-muted-foreground">following</span>
    </>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Profile Header */}
      <Card className="mb-8">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar_url || undefined} alt="" />
              <AvatarFallback className="text-xl">
                {getAvatarInitials(profile.display_name, profile.username)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {profile.display_name || profile.username}
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  @{profile.username}
                  {profile.account_type === "private" && (
                    <span className="inline-flex items-center gap-1">
                      · <Lock className="w-3 h-3" aria-hidden="true" /> Private
                    </span>
                  )}
                </p>
              </div>

              {profile.bio && <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>}

              {profile.primary_instrument && (
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
                  <Music className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="font-medium">{profile.primary_instrument}</span>
                </div>
              )}

              <div className="flex gap-5 text-sm">
                {linkFollowLists ? (
                  <>
                    <Link href={`/profile/${profile.username}/followers`} className="hover:underline">
                      {followers}
                    </Link>
                    <Link href={`/profile/${profile.username}/following`} className="hover:underline">
                      {following}
                    </Link>
                  </>
                ) : (
                  <>
                    <span>{followers}</span>
                    <span>{following}</span>
                  </>
                )}
              </div>

              {actions}
            </div>
          </div>
        </CardContent>
      </Card>

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
              value={<StreakValue timestamps={history.map((h) => h.created_at)} />}
            />
            <StatCard
              icon={<Calendar className="w-5 h-5 text-primary" />}
              label="Practice Days"
              value={profile.stats.practice_days.toString()}
            />
          </div>

          <div className="mb-8">
            <WeeklySummary
              entries={history}
              goalMinutes={profile.weekly_goal_minutes}
              goalHref={isOwnProfile ? "/settings#weekly-goal" : undefined}
            />
          </div>

          <div className="mb-8">
            <PracticeCalendar practiceData={history} />
          </div>

          <div className="mb-8">
            <PieceTotals pieces={pieceTotals(history)} />
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4 tracking-tight">Recent Sessions</h2>
            <Feed
              initialPage={sessionsPage}
              loadMore={loadMoreSessions}
              currentUserId={currentUserId}
              emptyContext={isOwnProfile ? "own-profile" : "other-profile"}
            />
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              This account is private.{" "}
              {profile.follow_status === "pending"
                ? "Your follow request is pending."
                : "Follow to see their practice sessions."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center" aria-hidden="true">
            {icon}
          </div>
          <div className="text-xl font-bold tracking-tight">{value}</div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
