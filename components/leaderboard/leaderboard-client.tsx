"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProfileWithStats } from "@/src/types";
import { formatDuration } from "@/lib/utils";
import { getAvatarInitials } from "@/lib/utils/avatar";
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

  const tabClass = (tab: string) =>
    `px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${activeTab === tab
      ? "bg-primary text-primary-foreground shadow-soft"
      : "text-muted-foreground hover:text-foreground hover:bg-accent"
    }`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-2xl tracking-tight">Leaderboard</CardTitle>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-muted/50 rounded-full p-1 w-fit">
            <button onClick={() => setActiveTab("time")} className={tabClass("time")}>
              Practice Time
            </button>
            <button onClick={() => setActiveTab("sessions")} className={tabClass("sessions")}>
              Total Sessions
            </button>
            <button onClick={() => setActiveTab("days")} className={tabClass("days")}>
              Practice Days
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No data available yet
            </p>
          ) : (
            <div className="space-y-1">
              {leaderboard.map((profile, index) => (
                <Link
                  key={profile.id}
                  href={`/profile/${profile.username}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent/60 transition-all duration-200"
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    <span
                      className={`font-bold text-base ${index === 0
                          ? "text-amber-500"
                          : index === 1
                            ? "text-slate-400"
                            : index === 2
                              ? "text-amber-600"
                              : "text-muted-foreground"
                        }`}
                    >
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                    </span>
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={profile.avatar_url || undefined}
                      alt={profile.username}
                    />
                    <AvatarFallback>
                      {getAvatarInitials(profile.display_name, profile.username)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Profile Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {profile.display_name || profile.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{profile.username}
                    </p>
                    {profile.primary_instrument && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Music className="w-3 h-3" />
                        <span>{profile.primary_instrument}</span>
                      </div>
                    )}
                  </div>

                  {/* Metric */}
                  <div className="text-right">
                    <p className="font-semibold text-sm">{getMetricValue(profile)}</p>
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
