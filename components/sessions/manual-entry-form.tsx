"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { INSTRUMENTS } from "@/src/types";

interface ManualEntryFormProps {
  onSave: (data: {
    duration_seconds: number;
    instrument: string;
    piece_name?: string;
    skills_practiced?: string;
    description?: string;
    focus?: "clear_goals" | "mid" | "noodling";
    entropy?: "few_measures" | "in_between" | "whole_piece";
    enjoyment?: "progress" | "ok" | "stuck";
    created_at?: string;
  }) => Promise<{ id: string }>;
}

export function ManualEntryForm({ onSave }: ManualEntryFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Form fields
  const [instrument, setInstrument] = useState<string>("");
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [time, setTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().split(' ')[0].substring(0, 5);
  });
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [pieceName, setPieceName] = useState("");
  const [skillsPracticed, setSkillsPracticed] = useState("");
  const [description, setDescription] = useState("");
  const [focus, setFocus] = useState<"clear_goals" | "mid" | "noodling" | "">("");
  const [entropy, setEntropy] = useState<"few_measures" | "in_between" | "whole_piece" | "">("");
  const [enjoyment, setEnjoyment] = useState<"progress" | "ok" | "stuck" | "">("");

  const handleSave = async () => {
    // Validation
    if (!instrument) {
      showToast("Please select an instrument.", "error");
      return;
    }

    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMinutes <= 0) {
      showToast("Please enter a valid practice duration.", "error");
      return;
    }

    setIsSaving(true);

    try {
      // Combine date and time to create timestamp
      const timestamp = new Date(`${date}T${time}`).toISOString();

      const sessionData = {
        duration_seconds: totalMinutes * 60,
        instrument,
        piece_name: pieceName.trim() || undefined,
        skills_practiced: skillsPracticed.trim() || undefined,
        description: description.trim() || undefined,
        focus: focus || undefined,
        entropy: entropy || undefined,
        enjoyment: enjoyment || undefined,
        created_at: timestamp,
      };

      const result = await onSave(sessionData);

      showToast("Your practice session has been saved.", "success");

      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving session:", error);
      showToast("Failed to save session. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual Practice Entry</CardTitle>
          <CardDescription>
            Log a practice session manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Practice Duration</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="Hours"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="Minutes"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Instrument */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Instrument *</label>
            <select
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select instrument</option>
              {INSTRUMENTS.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>

          {/* Piece Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">What did you practice?</label>
            <input
              type="text"
              value={pieceName}
              onChange={(e) => setPieceName(e.target.value)}
              placeholder="e.g., Bach Cello Suite No. 1"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Skills Practiced */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Skills Practiced</label>
            <input
              type="text"
              value={skillsPracticed}
              onChange={(e) => setSkillsPracticed(e.target.value)}
              placeholder="e.g., vibrato, scales, sight-reading"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Focus */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Focus</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFocus(focus === "clear_goals" ? "" : "clear_goals")}
                className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  focus === "clear_goals"
                    ? "bg-green-500 text-white border-green-600"
                    : "bg-background border-input hover:bg-accent"
                }`}
              >
                Clear Goals
              </button>
              <button
                type="button"
                onClick={() => setFocus(focus === "mid" ? "" : "mid")}
                className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  focus === "mid"
                    ? "bg-yellow-500 text-white border-yellow-600"
                    : "bg-background border-input hover:bg-accent"
                }`}
              >
                Mid
              </button>
              <button
                type="button"
                onClick={() => setFocus(focus === "noodling" ? "" : "noodling")}
                className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  focus === "noodling"
                    ? "bg-red-500 text-white border-red-600"
                    : "bg-background border-input hover:bg-accent"
                }`}
              >
                Noodling
              </button>
            </div>
          </div>

          {/* Entropy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Entropy</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEntropy(entropy === "few_measures" ? "" : "few_measures")}
                className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  entropy === "few_measures"
                    ? "bg-green-500 text-white border-green-600"
                    : "bg-background border-input hover:bg-accent"
                }`}
              >
                Few Measures
              </button>
              <button
                type="button"
                onClick={() => setEntropy(entropy === "in_between" ? "" : "in_between")}
                className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  entropy === "in_between"
                    ? "bg-yellow-500 text-white border-yellow-600"
                    : "bg-background border-input hover:bg-accent"
                }`}
              >
                In Between
              </button>
              <button
                type="button"
                onClick={() => setEntropy(entropy === "whole_piece" ? "" : "whole_piece")}
                className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  entropy === "whole_piece"
                    ? "bg-red-500 text-white border-red-600"
                    : "bg-background border-input hover:bg-accent"
                }`}
              >
                Whole Piece
              </button>
            </div>
          </div>

          {/* Enjoyment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Enjoyment</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEnjoyment(enjoyment === "progress" ? "" : "progress")}
                className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  enjoyment === "progress"
                    ? "bg-green-500 text-white border-green-600"
                    : "bg-background border-input hover:bg-accent"
                }`}
              >
                Progress
              </button>
              <button
                type="button"
                onClick={() => setEnjoyment(enjoyment === "ok" ? "" : "ok")}
                className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  enjoyment === "ok"
                    ? "bg-yellow-500 text-white border-yellow-600"
                    : "bg-background border-input hover:bg-accent"
                }`}
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setEnjoyment(enjoyment === "stuck" ? "" : "stuck")}
                className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  enjoyment === "stuck"
                    ? "bg-red-500 text-white border-red-600"
                    : "bg-background border-input hover:bg-accent"
                }`}
              >
                Stuck
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How did it go? Any insights?"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          disabled={isSaving}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Session"}
        </Button>
      </div>
    </div>
  );
}
