import { notFound, redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { FollowButton } from "@/components/profile/follow-button";
import { ProfileView } from "@/components/profile/profile-view";
import { getCurrentUser } from "@/lib/actions/auth";
import { getPracticeHistory, getProfileByUsername } from "@/lib/actions/profile";
import { getUserSessions } from "@/lib/actions/sessions";

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
  if (profile.is_demo) {
    redirect(`/demo/profile/${profile.username}`);
  }

  const currentUser = await getCurrentUser();
  const isOwnProfile = currentUser?.id === profile.id;

  const canViewSessions =
    isOwnProfile ||
    profile.account_type === "public" ||
    profile.is_following;

  const [sessionsPage, history] = canViewSessions
    ? await Promise.all([getUserSessions(profile.id), getPracticeHistory(profile.id)])
    : [{ sessions: [], nextCursor: null }, []];

  return (
    <AppLayout>
      <ProfileView
        profile={profile}
        history={history}
        sessionsPage={sessionsPage}
        loadMoreSessions={getUserSessions.bind(null, profile.id)}
        canViewSessions={canViewSessions}
        isOwnProfile={isOwnProfile}
        currentUserId={currentUser?.id}
        actions={
          !isOwnProfile && (
            <FollowButton
              userId={profile.id}
              followStatus={profile.follow_status}
              disabled={!currentUser}
            />
          )
        }
      />
    </AppLayout>
  );
}
