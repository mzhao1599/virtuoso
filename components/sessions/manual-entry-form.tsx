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

      await onSave(sessionData);

      showToast("Your practice session has been saved.", "success");

      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving session:", error);
      showToast("Failed to save session. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const indicatorButton = (
    isActive: boolean,
    activeColor: "emerald" | "amber" | "rose",
  ) => {
    if (!isActive) {
      return "bg-white border-input text-foreground hover:bg-accent";
    }
    const colors = {
      emerald: "bg-emerald-50 border-emerald-300 text-emerald-700",
      amber: "bg-amber-50 border-amber-300 text-amber-700",
      rose: "bg-rose-50 border-rose-300 text-rose-700",
    };
    return colors[activeColor];
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-tight">Manual Practice Entry</CardTitle>
          <CardDescription>
            Log a practice session manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-base"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input-base"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Practice Duration</label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Hours"
                className="input-base"
              />
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Minutes"
                className="input-base"
              />
            </div>
          </div>

          {/* Instrument */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Instrument <span className="text-destructive">*</span></label>
            <select
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              className="select-base"
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
              className="input-base"
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
              className="input-base"
            />
          </div>

          {/* Focus */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Focus</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFocus(focus === "clear_goals" ? "" : "clear_goals")}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${indicatorButton(focus === "clear_goals", "emerald")}`}
              >
                Clear Goals
              </button>
              <button
                type="button"
                onClick={() => setFocus(focus === "mid" ? "" : "mid")}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${indicatorButton(focus === "mid", "amber")}`}
              >
                Mid
              </button>
              <button
                type="button"
                onClick={() => setFocus(focus === "noodling" ? "" : "noodling")}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${indicatorButton(focus === "noodling", "rose")}`}
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
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${indicatorButton(entropy === "few_measures", "emerald")}`}
              >
                Few Measures
              </button>
              <button
                type="button"
                onClick={() => setEntropy(entropy === "in_between" ? "" : "in_between")}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${indicatorButton(entropy === "in_between", "amber")}`}
              >
                In Between
              </button>
              <button
                type="button"
                onClick={() => setEntropy(entropy === "whole_piece" ? "" : "whole_piece")}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${indicatorButton(entropy === "whole_piece", "rose")}`}
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
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${indicatorButton(enjoyment === "progress", "emerald")}`}
              >
                Progress
              </button>
              <button
                type="button"
                onClick={() => setEnjoyment(enjoyment === "ok" ? "" : "ok")}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${indicatorButton(enjoyment === "ok", "amber")}`}
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setEnjoyment(enjoyment === "stuck" ? "" : "stuck")}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${indicatorButton(enjoyment === "stuck", "rose")}`}
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
              className="input-base resize-none min-h-[100px]"
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
          size="lg"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 gap-2"
          size="lg"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Session"}
        </Button>
      </div>
    </div>
  );
}
