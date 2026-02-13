"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogTitle,
  DialogHeader, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Save, X, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { updateSession, deleteSession } from "@/lib/actions/sessions";
import { formatDuration } from "@/lib/utils";
import type { Session } from "@/src/types";
import { INSTRUMENTS } from "@/src/types";

interface EditSessionFormProps {
  session: Session;
}

export function EditSessionForm({ session }: EditSessionFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [pieceName, setPieceName] = useState(session.piece_name || "");
  const [skillsPracticed, setSkillsPracticed] = useState(session.skills_practiced || "");
  const [description, setDescription] = useState(session.description || "");
  const [focus, setFocus] = useState<"clear_goals" | "mid" | "noodling" | "">(session.focus || "");
  const [entropy, setEntropy] = useState<"few_measures" | "in_between" | "whole_piece" | "">(session.entropy || "");
  const [enjoyment, setEnjoyment] = useState<"progress" | "ok" | "stuck" | "">(session.enjoyment || "");
  
  // Editable fields for manual entries
  const [instrument, setInstrument] = useState(session.instrument);
  const [hours, setHours] = useState(Math.floor(session.duration_seconds / 3600).toString());
  const [minutes, setMinutes] = useState(Math.floor((session.duration_seconds % 3600) / 60).toString());
  
  // Date/time editing for manual entries
  const [date, setDate] = useState(() => {
    const sessionDate = new Date(session.created_at);
    return sessionDate.toISOString().split('T')[0];
  });
  const [time, setTime] = useState(() => {
    const sessionDate = new Date(session.created_at);
    return sessionDate.toTimeString().split(' ')[0].substring(0, 5);
  });

  const handleSave = async () => {
    // Validation for manual entries
    if (session.is_manual_entry) {
      if (!instrument) {
        showToast("Please select an instrument.", "error");
        return;
      }
      const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
      if (totalMinutes <= 0) {
        showToast("Please enter a valid practice duration.", "error");
        return;
      }
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        piece_name: pieceName || null,
        skills_practiced: skillsPracticed || null,
        description: description || null,
        focus: focus || null,
        entropy: entropy || null,
        enjoyment: enjoyment || null,
      };

      // If manual entry, include updated duration, instrument, and timestamp
      if (session.is_manual_entry) {
        const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
        updateData.duration_seconds = totalMinutes * 60;
        updateData.instrument = instrument;
        const timestamp = new Date(`${date}T${time}`).toISOString();
        updateData.created_at = timestamp;
      }
      
      await updateSession(session.id, updateData);
      
      showToast("Session updated successfully!", "success");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error updating session:", error);
      showToast("Failed to update session. Please try again.", "error");
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSession(session.id);
      showToast("Session deleted successfully!", "success");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error deleting session:", error);
      showToast("Failed to delete session. Please try again.", "error");
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Practice Session</CardTitle>
        <CardDescription>
          Update your practice session details
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Session Info (Read-only for recorded sessions) */}
        {!session.is_manual_entry && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Duration:</span>
              <span className="font-medium">{formatDuration(session.duration_seconds)}</span>
            </div>
            {session.break_seconds > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Break Time:</span>
                <span className="font-medium">{formatDuration(session.break_seconds)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Instrument:</span>
              <span className="font-medium">{session.instrument}</span>
            </div>
          </div>
        )}

        {/* Manual Entry Badge */}
        {session.is_manual_entry && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-3">
            <span className="text-sm text-orange-600 dark:text-orange-400">✎ Manual Entry - All fields are editable</span>
          </div>
        )}

        {/* Date and Time (Editable for manual entries only) */}
        {session.is_manual_entry && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="date" className="block text-sm font-medium">Date</label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="time" className="block text-sm font-medium">Time</label>
              <input
                type="time"
                id="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        )}

        {/* Duration (Editable for manual entries only) */}
        {session.is_manual_entry && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Practice Duration</label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Hours"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Minutes"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        )}

        {/* Instrument (Editable for manual entries only) */}
        {session.is_manual_entry && (
          <div className="space-y-2">
            <label htmlFor="instrument" className="block text-sm font-medium">Instrument *</label>
            <select
              id="instrument"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select instrument</option>
              {INSTRUMENTS.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Editable Fields */}
        <div className="space-y-4">
          <div>
            <label htmlFor="piece_name" className="block text-sm font-medium mb-2">
              Piece/Song Name
            </label>
            <input
              type="text"
              id="piece_name"
              value={pieceName}
              onChange={(e) => setPieceName(e.target.value)}
              placeholder="What did you practice?"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="skills" className="block text-sm font-medium mb-2">
              Skills Practiced
            </label>
            <input
              type="text"
              id="skills"
              value={skillsPracticed}
              onChange={(e) => setSkillsPracticed(e.target.value)}
              placeholder="e.g., Arpeggios, Sight-reading, Scales"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Focus Indicator */}
          <div>
            <label className="block text-sm font-medium mb-2">Focus</label>
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

          {/* Entropy Indicator */}
          <div>
            <label className="block text-sm font-medium mb-2">Entropy</label>
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

          {/* Enjoyment Indicator */}
          <div>
            <label className="block text-sm font-medium mb-2">Enjoyment</label>
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

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How did it go? Any insights?"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="flex-1 gap-2"
              size="lg"
            >
              <Save className="w-5 h-5" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isSaving || isDeleting}
              size="lg"
              className="gap-2"
            >
              <X className="w-5 h-5" />
              Cancel
            </Button>
          </div>

          {/* Delete Section */}
          <div className="pt-6 border-t">
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
              disabled={isSaving || isDeleting}
              size="sm"
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Session
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Practice Session?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your practice session
              and all associated data including kudos and comments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
