import { LeaderboardClient } from "@/components/leaderboard/leaderboard-client";
import { getDemoLeaderboard } from "@/lib/demo/data";

export const revalidate = 300;

export default async function DemoLeaderboardPage() {
  const [timeLeaderboard, sessionsLeaderboard, daysLeaderboard] = await Promise.all([
    getDemoLeaderboard("time"),
    getDemoLeaderboard("sessions"),
    getDemoLeaderboard("days"),
  ]);

  return (
    <LeaderboardClient
      timeLeaderboard={timeLeaderboard}
      sessionsLeaderboard={sessionsLeaderboard}
      daysLeaderboard={daysLeaderboard}
    />
  );
}
