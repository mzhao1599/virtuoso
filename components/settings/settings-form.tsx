"use client";

import { Button } from "@/components/ui/button";
import { updateProfile } from "@/lib/actions/profile";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import type { Profile } from "@/src/types";
import { INSTRUMENTS } from "@/src/types";

interface SettingsFormProps {
  user: Profile;
}

export function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState(user.display_name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [primaryInstrument, setPrimaryInstrument] = useState(user.primary_instrument || "");
  const [accountType, setAccountType] = useState<"public" | "private">(
    user.account_type || "public"
  );
  const [weeklyGoalHours, setWeeklyGoalHours] = useState(
    user.weekly_goal_minutes ? String(Math.round((user.weekly_goal_minutes / 60) * 100) / 100) : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile({
        display_name: displayName,
        bio: bio,
        primary_instrument: primaryInstrument,
        account_type: accountType,
        weekly_goal_hours: weeklyGoalHours,
      });

      showToast("Settings updated successfully!", "success");
      router.refresh();
    } catch (error) {
      console.error("Error updating settings:", error);
      showToast(
        error instanceof Error && error.message ? error.message : "Failed to update settings. Please try again.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Username (read-only) */}
      <div>
        <label className="block text-sm font-medium mb-2">Username</label>
        <input
          type="text"
          value={user.username}
          disabled
          className="input-base bg-muted text-muted-foreground cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Username cannot be changed
        </p>
      </div>

      {/* Display Name */}
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium mb-2">
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your display name"
          className="input-base"
          maxLength={50}
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium mb-2">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          className="input-base resize-none min-h-[100px]"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          {bio.length}/500 characters
        </p>
      </div>

      {/* Primary Instrument */}
      <div>
        <label htmlFor="instrument" className="block text-sm font-medium mb-2">
          Primary Instrument
        </label>
        <select
          id="instrument"
          value={primaryInstrument}
          onChange={(e) => setPrimaryInstrument(e.target.value)}
          className="select-base"
        >
          <option value="">Select an instrument</option>
          {INSTRUMENTS.map((instrument) => (
            <option key={instrument} value={instrument}>
              {instrument}
            </option>
          ))}
        </select>
      </div>

      {/* Weekly goal */}
      <div id="weekly-goal" className="scroll-mt-24">
        <label htmlFor="weeklyGoal" className="block text-sm font-medium mb-2">
          Weekly practice goal
        </label>
        <div className="flex items-center gap-3">
          <input
            id="weeklyGoal"
            type="number"
            inputMode="decimal"
            min="0"
            max="168"
            step="0.5"
            value={weeklyGoalHours}
            onChange={(e) => setWeeklyGoalHours(e.target.value)}
            placeholder="No goal"
            className="input-base w-32"
            aria-describedby="weeklyGoalHelp"
          />
          <span className="text-sm text-muted-foreground">hours per week</span>
        </div>
        <p id="weeklyGoalHelp" className="text-xs text-muted-foreground mt-1.5">
          Optional. Your dashboard shows progress for the current week (Sunday to Saturday). Leave empty for no goal.
        </p>
      </div>

      {/* Account Privacy */}
      <div>
        <label className="block text-sm font-medium mb-3">Account Privacy</label>
        <div className="space-y-2">
          <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${accountType === "public" ? "border-primary/30 bg-primary/5" : "border-input hover:bg-accent"
            }`}>
            <input
              type="radio"
              name="accountType"
              value="public"
              checked={accountType === "public"}
              onChange={(e) => setAccountType(e.target.value as "public")}
              className="mt-0.5 accent-primary"
            />
            <div>
              <div className="text-sm font-medium">Public</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Your practice sessions, stats, kudos and comments are visible to everyone, and you appear on the leaderboard. Anyone can follow you.
              </div>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${accountType === "private" ? "border-primary/30 bg-primary/5" : "border-input hover:bg-accent"
            }`}>
            <input
              type="radio"
              name="accountType"
              value="private"
              checked={accountType === "private"}
              onChange={(e) => setAccountType(e.target.value as "private")}
              className="mt-0.5 accent-primary"
            />
            <div>
              <div className="text-sm font-medium">Private</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Your name, bio and instrument stay visible, but only followers you approve can see your sessions, stats, kudos and comments, and only they see you on the leaderboard.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <Button type="submit" disabled={isLoading} className="w-full" size="lg">
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
