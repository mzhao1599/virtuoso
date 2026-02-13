"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Sparkles, Play, Trash2, Upload, Check, Loader2 } from "lucide-react";
import { useRetroactiveRecorder, type Snippet } from "@/hooks/useRetroactiveRecorder";
import { useToast } from "@/components/ui/toast";
import { uploadSnippet } from "@/lib/actions/snippets";

interface RecorderProps {
  sessionId?: string;
  sessionStartTime: number;
  currentPracticeSeconds: number; // Current practice time (excluding breaks)
  isOnBreak: boolean;
  isStopped: boolean;
  onResumeFromBreak?: () => void; // Callback to reset audio buffer
}

export interface RecorderHandle {
  uploadAllSnippets: (sessionId: string) => Promise<void>;
}

export const Recorder = forwardRef<RecorderHandle, RecorderProps>(
  function Recorder({ sessionId, sessionStartTime, currentPracticeSeconds, isOnBreak, isStopped, onResumeFromBreak }, ref) {
  const { showToast } = useToast();
  const { isListening, startListening, stopListening, capture, resetBuffer, error } = useRetroactiveRecorder();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [flashActive, setFlashActive] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Show error from hook
  useEffect(() => {
    if (error) {
      showToast(error, "error");
    }
  }, [error, showToast]);

  // Stop listening when session is fully stopped
  useEffect(() => {
    if (isStopped && isListening) {
      stopListening();
    }
  }, [isStopped, isListening, stopListening]);

  // Reset buffer when resuming from break
  const wasOnBreakRef = useRef(isOnBreak);
  useEffect(() => {
    if (wasOnBreakRef.current && !isOnBreak && isListening) {
      // Just resumed from break
      console.log('[Recorder] Resuming from break, resetting buffer');
      resetBuffer();
      if (onResumeFromBreak) {
        onResumeFromBreak();
      }
    }
    wasOnBreakRef.current = isOnBreak;
  }, [isOnBreak, isListening, resetBuffer, onResumeFromBreak]);

  const handleToggleMic = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  const handleCapture = useCallback(async () => {
    console.log("[Recorder] handleCapture called", { isListening, currentPracticeSeconds });
    if (!isListening) {
      console.log("[Recorder] Not listening, aborting");
      return;
    }

    console.log("[Recorder] Calling capture()...");
    const snippet = await capture(currentPracticeSeconds * 1000); // Convert to ms
    console.log("[Recorder] Capture result:", snippet);
    
    if (snippet) {
      console.log("[Recorder] Adding snippet to state, current snippets:", snippets.length);
      setSnippets((prev) => {
        const updated = [snippet, ...prev];
        console.log("[Recorder] Updated snippets count:", updated.length);
        return updated;
      });

      // Flash feedback
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 400);
    } else {
      showToast("No audio captured yet — keep practicing!", "info");
    }
  }, [isListening, capture, currentPracticeSeconds, showToast, snippets.length]);

  const handlePlay = (snippet: Snippet) => {
    if (playingId === snippet.id) {
      // Stop and reset if already playing
      audioRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setPlayingId(null);
      setAudioProgress(0);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(snippet.url);
    audioRef.current = audio;
    audio.onended = () => {
      setPlayingId(null);
      setAudioProgress(0);
    };
    audio.ontimeupdate = () => {
      setAudioProgress(audio.currentTime);
    };
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
    };
    audio.play();
    setPlayingId(snippet.id);
    setAudioProgress(0);
  };

  const handleDelete = (id: string) => {
    const snippet = snippets.find((s) => s.id === id);
    if (snippet) {
      URL.revokeObjectURL(snippet.url);
      if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
    }
    setSnippets((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpload = async (snippetId: string) => {
    if (!sessionId) {
      showToast("Save the session first before uploading snippets.", "error");
      return;
    }

    const snippet = snippets.find((s) => s.id === snippetId);
    if (!snippet || snippet.uploaded || snippet.uploading) return;

    // Optimistic: mark uploading
    setSnippets((prev) =>
      prev.map((s) => (s.id === snippetId ? { ...s, uploading: true } : s))
    );

    try {
      const formData = new FormData();
      formData.append("file", snippet.blob, `snippet-${snippet.id}.wav`);
      formData.append("session_id", sessionId);
      formData.append("start_time_ms", String(snippet.capturedAt));
      formData.append("duration_ms", String(Math.round(snippet.durationMs)));

      await uploadSnippet(formData);

      setSnippets((prev) =>
        prev.map((s) =>
          s.id === snippetId ? { ...s, uploading: false, uploaded: true } : s
        )
      );
      showToast("Snippet uploaded!", "success");
    } catch {
      setSnippets((prev) =>
        prev.map((s) =>
          s.id === snippetId ? { ...s, uploading: false } : s
        )
      );
      showToast("Failed to upload snippet.", "error");
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Expose method to upload all snippets (called after session save)
  useImperativeHandle(ref, () => ({
    uploadAllSnippets: async (sessionId: string) => {
      const pendingSnippets = snippets.filter(s => !s.uploaded && !s.uploading);
      
      if (pendingSnippets.length === 0) return;

      // Limit: Only upload the first snippet (most recent)
      const snippetsToUpload = pendingSnippets.slice(0, 1);

      // Mark as uploading
      setSnippets(prev => prev.map(s => 
        snippetsToUpload.some(su => su.id === s.id) ? { ...s, uploading: true } : s
      ));

      // Upload (just first snippet for free users)
      const uploadPromises = snippetsToUpload.map(async (snippet) => {
        try {
          const formData = new FormData();
          formData.append("file", snippet.blob, `snippet-${snippet.id}.wav`);
          formData.append("session_id", sessionId);
          formData.append("start_time_ms", String(snippet.capturedAt));
          formData.append("duration_ms", String(Math.round(snippet.durationMs)));

          await uploadSnippet(formData);
          
          setSnippets(prev => prev.map(s => 
            s.id === snippet.id ? { ...s, uploading: false, uploaded: true } : s
          ));
        } catch (err) {
          console.error(`Failed to upload snippet ${snippet.id}:`, err);
          setSnippets(prev => prev.map(s => 
            s.id === snippet.id ? { ...s, uploading: false } : s
          ));
        }
      });

      await Promise.all(uploadPromises);
      
      // Show message if there are more snippets that weren't uploaded
      const skippedCount = pendingSnippets.length - snippetsToUpload.length;
      if (skippedCount > 0) {
        showToast(`${skippedCount} snippet${skippedCount > 1 ? 's' : ''} not uploaded (limit: 1 per session)`, "info");
      }
    },
  }), [snippets, showToast]);

  return (
    <div className="space-y-4">
      {/* ── Capture Controls ─────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Mic toggle */}
        <Button
          variant={isListening ? "destructive" : "outline"}
          size="sm"
          onClick={handleToggleMic}
          disabled={isStopped}
          className="gap-2"
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4" />
              Turn Mic Off
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Turn Mic On (Capture Miracles!)
            </>
          )}
        </Button>

        {/* Capture button — large and thumb-friendly */}
        {isListening && !isStopped && !isOnBreak && (
          <button
            onClick={handleCapture}
            className={`
              relative flex items-center gap-2 px-6 py-3 rounded-full
              bg-gradient-to-r from-amber-500 to-orange-500
              text-white font-semibold text-sm
              shadow-lg hover:shadow-xl
              active:scale-95 transition-all duration-150
              ${flashActive ? "ring-4 ring-amber-300 animate-pulse" : ""}
            `}
          >
            <Sparkles className="w-5 h-5" />
            Capture Miracle
          </button>
        )}

        {isListening && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Listening
          </span>
        )}
      </div>

      {/* Screen flash overlay */}
      {flashActive && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-amber-400/20 animate-[fadeOut_400ms_ease-out_forwards]" />
      )}

      {/* ── Snippet List ──────────────────────────────────────── */}
      {snippets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Captured Snippets ({snippets.length})
            </CardTitle>
            {!isOnBreak && !isStopped && (
              <CardDescription className="text-xs">
                View and manage your snippets during a break
              </CardDescription>
            )}
            {(isOnBreak || isStopped) && (
              <CardDescription className="text-xs">
                Only your most recent snippet will be saved (1 per session limit)
              </CardDescription>
            )}
          </CardHeader>
          {(isOnBreak || isStopped) && (
            <CardContent className="space-y-3">
            {snippets.map((snippet) => (
              <div
                key={snippet.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
              >
                {/* Play button and progress bar */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
                  onClick={() => handlePlay(snippet)}
                >
                  <Play className="w-5 h-5" />
                </Button>

                <div className="flex-1 min-w-0">
                  <div className="relative h-2 bg-amber-200/30 dark:bg-amber-900/30 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-100"
                      style={{ 
                        width: playingId === snippet.id && audioDuration > 0
                          ? `${(audioProgress / audioDuration) * 100}%` 
                          : '0%'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>
                      {playingId === snippet.id 
                        ? formatTime(snippet.capturedAt / 1000 + audioProgress) 
                        : formatTime(snippet.capturedAt / 1000)}
                    </span>
                    <span>{formatTime(snippet.capturedAt / 1000 + snippet.durationMs / 1000)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">

                  {snippet.uploaded ? (
                    <div className="w-8 h-8 flex items-center justify-center text-green-500">
                      <Check className="w-4 h-4" />
                    </div>
                  ) : snippet.uploading ? (
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => handleUpload(snippet.id)}
                      disabled={!sessionId}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(snippet.id)}
                    disabled={snippet.uploading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
          )}
        </Card>
      )}
    </div>
  );
});
