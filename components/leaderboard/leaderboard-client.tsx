"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ProfileWithStats } from "@/src/types";
import { formatDuration } from "@/lib/utils";
import Link from "next/link";
import { Music, Trophy } from "lucide-react";
import { useState } from "react";

interface LeaderboardClientProps {
  timeLeaderboard: ProfileWithStats[];
  sessionsLeaderboard: ProfileWithStats[];
  daysLeaderboard: ProfileWithStats[];
}

export function LeaderboardClient({
  timeLeaderboard,
  sessionsLeaderboard,
  daysLeaderboard,
}: LeaderboardClientProps) {
  const [activeTab, setActiveTab] = useState<"time" | "sessions" | "days">("time");

  const leaderboard =
    activeTab === "time"
      ? timeLeaderboard
      : activeTab === "sessions"
      ? sessionsLeaderboard
      : daysLeaderboard;

  const getMetricValue = (profile: ProfileWithStats) => {
    switch (activeTab) {
      case "time":
        return formatDuration(profile.stats.total_seconds);
      case "sessions":
        return `${profile.stats.total_sessions} sessions`;
      case "days":
        return `${profile.stats.practice_days} days`;
    }
  };

  const getMetricLabel = () => {
    switch (activeTab) {
      case "time":
        return "Total Practice Time";
      case "sessions":
        return "Total Sessions";
      case "days":
        return "Practice Days";
    }
  };

  return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-8 h-8 text-primary" />
              <CardTitle className="text-3xl">Leaderboard</CardTitle>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2">
              <Button
                variant={activeTab === "time" ? "default" : "outline"}
                onClick={() => setActiveTab("time")}
              >
                Practice Time
              </Button>
              <Button
                variant={activeTab === "sessions" ? "default" : "outline"}
                onClick={() => setActiveTab("sessions")}
              >
                Total Sessions
              </Button>
              <Button
                variant={activeTab === "days" ? "default" : "outline"}
                onClick={() => setActiveTab("days")}
              >
                Practice Days
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No data available yet
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((profile, index) => (
                  <Link
                    key={profile.id}
                    href={`/profile/${profile.username}`}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-accent transition-colors"
                  >
                    {/* Rank */}
                    <div className="w-8 text-center">
                      <span
                        className={`font-bold text-lg ${
                          index === 0
                            ? "text-yellow-500"
                            : index === 1
                            ? "text-gray-400"
                            : index === 2
                            ? "text-amber-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </span>
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={profile.avatar_url || undefined}
                        alt={profile.username}
                      />
                      <AvatarFallback>
                        {profile.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Profile Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {profile.display_name || profile.username}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{profile.username}
                      </p>
                      {profile.primary_instrument && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Music className="w-3 h-3" />
                          <span>{profile.primary_instrument}</span>
                        </div>
                      )}
                    </div>

                    {/* Metric */}
                    <div className="text-right">
                      <p className="font-bold text-lg">{getMetricValue(profile)}</p>
                      <p className="text-xs text-muted-foreground">{getMetricLabel()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
