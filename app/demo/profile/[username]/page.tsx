import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile/profile-view";
import { loadMoreDemoUserSessions } from "@/lib/demo/actions";
import { getDemoProfile, getDemoUserSessions } from "@/lib/demo/data";

export const revalidate = 300;

// Render each demo profile on first request, then serve it from the cache.
export async function generateStaticParams() {
  return [];
}

interface DemoProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: DemoProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} · Demo · Virtuoso` };
}

export default async function DemoProfilePage({ params }: DemoProfilePageProps) {
  const { username } = await params;
  const demo = await getDemoProfile(username);
  if (!demo) notFound();

  const sessionsPage = await getDemoUserSessions(demo.profile.id);

  return (
    <ProfileView
      profile={demo.profile}
      history={demo.history}
      sessionsPage={sessionsPage}
      loadMoreSessions={loadMoreDemoUserSessions.bind(null, demo.profile.id)}
      canViewSessions
      isOwnProfile={false}
      linkFollowLists={false}
    />
  );
}
