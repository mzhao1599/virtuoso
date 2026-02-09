import { getLeaderboard } from "@/lib/actions/profile";
import { LeaderboardClient } from "@/components/leaderboard/leaderboard-client";
import { AppLayout } from "@/components/layout/app-layout";

export default async function LeaderboardPage() {
  // Fetch all three leaderboards in parallel
  const [timeLeaderboard, sessionsLeaderboard, daysLeaderboard] = await Promise.all([
    getLeaderboard("time", 50),
    getLeaderboard("sessions", 50),
    getLeaderboard("days", 50),
  ]);

  return (
    <AppLayout>
      <LeaderboardClient
        timeLeaderboard={timeLeaderboard}
        sessionsLeaderboard={sessionsLeaderboard}
        daysLeaderboard={daysLeaderboard}
      />
    </AppLayout>
  );
}
