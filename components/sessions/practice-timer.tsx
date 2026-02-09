"use client";

import { useState, useEffect, useRef } from "react";
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
import { Play, Pause, Check, Save } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { INSTRUMENTS } from "@/src/types";
import { Recorder, type RecorderHandle } from "./recorder";
import type { BreakEvent } from "@/src/types";

interface PracticeTimerProps {
  onSave: (data: {
    duration_seconds: number;
    break_seconds: number;
    break_timeline: BreakEvent[];
    instrument: string;
    piece_name?: string;
    skills_practiced?: string;
    description?: string;
    focus?: "clear_goals" | "mid" | "noodling";
    entropy?: "few_measures" | "in_between" | "whole_piece";
    enjoyment?: "progress" | "ok" | "stuck";
  }) => Promise<{ id: string }>;
}

export function PracticeTimer({ onSave }: PracticeTimerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [hasStarted, setHasStarted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [breakTimeline, setBreakTimeline] = useState<BreakEvent[]>([]);
  const [isStopped, setIsStopped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDoneDialog, setShowDoneDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const sessionStartRef = useRef<number>(Date.now());
  const recorderRef = useRef<RecorderHandle>(null);
  
  const [instrument, setInstrument] = useState<string>("");
  const [pieceName, setPieceName] = useState("");
  const [skillsPracticed, setSkillsPracticed] = useState("");
  const [description, setDescription] = useState("");
  const [focus, setFocus] = useState<"clear_goals" | "mid" | "noodling" | "">("");
  const [entropy, setEntropy] = useState<"few_measures" | "in_between" | "whole_piece" | "">("");
  const [enjoyment, setEnjoyment] = useState<"progress" | "ok" | "stuck" | "">("");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const breakStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning && !isOnBreak) {
      // Practice time
      startTimeRef.current = Date.now() - elapsedSeconds * 1000;
      
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedSeconds(elapsed);
        }
      }, 100);
    } else if (isOnBreak) {
      // Break time
      breakStartRef.current = Date.now() - breakSeconds * 1000;
      
      intervalRef.current = setInterval(() => {
        if (breakStartRef.current) {
          const elapsed = Math.floor((Date.now() - breakStartRef.current) / 1000);
          setBreakSeconds(elapsed);
        }
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isOnBreak, elapsedSeconds, breakSeconds]);

  const handleStart = () => {
    setHasStarted(true);
    setIsRunning(true);
    setIsOnBreak(false);
    setIsStopped(false);
    sessionStartRef.current = Date.now();
  };

  const handleBreak = () => {
    const totalElapsed = elapsedSeconds + breakSeconds;
    if (isOnBreak) {
      // Resume practice from break - record end of break event
      setIsOnBreak(false);
      setIsRunning(true);
      setBreakTimeline(prev => {
        if (prev.length > 0) {
          const lastBreak = prev[prev.length - 1];
          if (!lastBreak.end) {
            // Close the current break event
            return [...prev.slice(0, -1), { ...lastBreak, end: totalElapsed }];
          }
        }
        return prev;
      });
    } else if (isRunning) {
      // Start break - record start of break event
      setIsRunning(false);
      setIsOnBreak(true);
      setBreakTimeline(prev => [...prev, { start: totalElapsed, end: 0 }]);
    }
  };

  const handleDone = () => {
    setShowDoneDialog(true);
  };

  const confirmDone = () => {
    setIsRunning(false);
    setIsOnBreak(false);
    setIsStopped(true);
    setShowDoneDialog(false);
  };

  const handleCancel = () => {
    if (elapsedSeconds > 0) {
      setShowCancelDialog(true);
    } else {
      router.push("/dashboard");
    }
  };

  const confirmCancel = () => {
    setShowCancelDialog(false);
    router.push("/dashboard");
  };

  // Warn before leaving page if session is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((isRunning || isOnBreak || (elapsedSeconds > 0 && !isStopped)) && !isSaving) {
        e.preventDefault();
        e.returnValue = "You have an active practice session. Leave without saving?";
        return "You have an active practice session. Leave without saving?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRunning, isOnBreak, elapsedSeconds, isStopped, isSaving]);

  // Block internal navigation if session is in progress
  useEffect(() => {
    let isNavigating = false;

    const handleClick = (e: MouseEvent) => {
      if (isNavigating || isSaving) return;
      
      if ((isRunning || isOnBreak || (elapsedSeconds > 0 && !isStopped))) {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        
        if (link && link.href && !link.href.includes('/session/new')) {
          e.preventDefault();
          e.stopPropagation();
          
          showToast("You have an active practice session. Click Done to finish or Cancel to discard.", "error");
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isRunning, isOnBreak, elapsedSeconds, isStopped, isSaving, showToast]);

  const handleSave = async () => {
    if (!instrument) {
      showToast("Please select an instrument before saving!", "error");
      return;
    }
    
    if (elapsedSeconds === 0) {
      showToast("Please record some practice time!", "error");
      return;
    }

    setIsSaving(true);
    try {
      // Save the session first
      const session = await onSave({
        duration_seconds: elapsedSeconds,
        break_seconds: breakSeconds,
        break_timeline: breakTimeline,
        instrument,
        piece_name: pieceName || undefined,
        skills_practiced: skillsPracticed || undefined,
        description: description || undefined,
        focus: focus || undefined,
        entropy: entropy || undefined,
        enjoyment: enjoyment || undefined,
      });
      
      // Auto-upload any captured snippets
      if (recorderRef.current) {
        showToast("Uploading captured snippets...", "info");
        await recorderRef.current.uploadAllSnippets(session.id);
      }
      
      // Redirect to dashboard on success
      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving session:", error);
      showToast("Failed to save session. Please try again.", "error");
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Log Practice Session</CardTitle>
        <CardDescription>
          Use the timer to track your practice time
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="bg-primary/10 rounded-2xl p-8 text-center">
          <div className="text-6xl font-bold font-mono text-primary tabular-nums">
            {formatTime(elapsedSeconds)}
          </div>
          {breakSeconds > 0 && (
            <div className="text-2xl font-mono text-muted-foreground mt-2 tabular-nums">
              Break: {formatTime(breakSeconds)}
            </div>
          )}
          {hasStarted && (
            <div className="text-lg font-mono text-muted-foreground/80 mt-1 tabular-nums">
              Total: {formatTime(elapsedSeconds + breakSeconds)}
            </div>
          )}
          <div className="text-sm text-muted-foreground mt-2">
            {isRunning ? "Recording..." : isOnBreak ? "On Break" : isStopped ? "Stopped" : "Ready to start"}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex justify-center gap-3">
          {!hasStarted && (
            <Button size="lg" onClick={handleStart} className="gap-2">
              <Play className="w-5 h-5" />
              Start Practice
            </Button>
          )}
          
          {hasStarted && (isRunning || isOnBreak) && (
            <>
              <Button 
                size="lg" 
                variant={isOnBreak ? "default" : "outline"} 
                onClick={handleBreak} 
                className="gap-2"
              >
                <Pause className="w-5 h-5" />
                {isOnBreak ? "Resume" : "Break"}
              </Button>
              <Button size="lg" variant="destructive" onClick={handleDone} className="gap-2">
                <Check className="w-5 h-5" />
                Done
              </Button>
            </>
          )}
          
          {hasStarted && !isRunning && !isOnBreak && !isStopped && (
            <Button size="lg" variant="destructive" onClick={handleDone} className="gap-2">
              <Check className="w-5 h-5" />
              Done
            </Button>
          )}
        </div>

        {/* Audio Recorder — Capture Miracles */}
        {hasStarted && (
          <Recorder
            ref={recorderRef}
            sessionStartTime={sessionStartRef.current}
            currentPracticeSeconds={elapsedSeconds}
            isOnBreak={isOnBreak}
            isStopped={isStopped}
          />
        )}

        {/* Session Details Form */}
        {elapsedSeconds > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <label htmlFor="instrument" className="block text-sm font-medium mb-2">
                Instrument <span className="text-destructive">*</span>
              </label>
              <select
                id="instrument"
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isRunning}
              >
                <option value="">Select an instrument</option>
                {INSTRUMENTS.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>

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
                disabled={isRunning}
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
                disabled={isRunning}
              />
            </div>

            {/* Focus Indicator */}
            <div>
              <label className="block text-sm font-medium mb-2">Focus</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFocus(focus === "clear_goals" ? "" : "clear_goals")}
                  disabled={isRunning}
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
                  disabled={isRunning}
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
                  disabled={isRunning}
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
                  disabled={isRunning}
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
                  disabled={isRunning}
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
                  disabled={isRunning}
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
                  disabled={isRunning}
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
                  disabled={isRunning}
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
                  disabled={isRunning}
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
                disabled={isRunning}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={isSaving || !instrument || isRunning}
                className="flex-1 gap-2"
                size="lg"
              >
                <Save className="w-5 h-5" />
                {isSaving ? "Saving..." : "Save Session"}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isSaving || isRunning}
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Done Confirmation Dialog */}
      <Dialog open={showDoneDialog} onOpenChange={setShowDoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Session as Complete?</DialogTitle>
            <DialogDescription>
              You won't be able to record more time after this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDoneDialog(false)}>
              Continue Practicing
            </Button>
            <Button onClick={confirmDone}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Practice Session?</DialogTitle>
            <DialogDescription>
              Your recorded practice time will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Session
            </Button>
            <Button variant="destructive" onClick={confirmCancel}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}
