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
import { RatingPicker, FOCUS_OPTIONS, ENTROPY_OPTIONS, ENJOYMENT_OPTIONS } from "./rating-picker";

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
      const updateData: Parameters<typeof updateSession>[1] = {
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
          <div className="bg-muted rounded-xl p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Measured by the timer, so these can&apos;t be changed.</p>
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
          <div className="bg-muted rounded-xl p-3">
            <span className="text-sm text-muted-foreground">Entered by hand, so every field can be edited.</span>
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
                className="input-base"
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
                className="input-base"
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
                aria-label="Hours"
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
                aria-label="Minutes"
                placeholder="Minutes"
                className="input-base"
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
              className="input-base"
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
              className="input-base"
            />
          </div>

          <RatingPicker label="Focus" options={FOCUS_OPTIONS} value={focus} onChange={setFocus} />
          <RatingPicker label="Entropy" hint="(how much of the piece)" options={ENTROPY_OPTIONS} value={entropy} onChange={setEntropy} />
          <RatingPicker label="Enjoyment" options={ENJOYMENT_OPTIONS} value={enjoyment} onChange={setEnjoyment} />

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
              className="input-base resize-none"
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
          <div className="pt-6 border-t border-border">
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
