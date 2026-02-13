"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Music2, Edit, Play, Pause, Sparkles } from "lucide-react";
import Link from "next/link";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import { CommentsModal } from "./comments-modal";
import { KudosModal } from "./kudos-modal";
import { useState, useRef, useEffect } from "react";
import type { FeedSession } from "@/src/types";

interface SessionCardProps {
  session: FeedSession;
  currentUserId?: string;
  onKudo?: (sessionId: string) => void;
  onComment?: (sessionId: string) => void;
}

export function SessionCard({ session, currentUserId, onKudo, onComment }: SessionCardProps) {
  const { profile, instrument, duration_seconds, break_seconds, piece_name, skills_practiced, description, focus, entropy, enjoyment, kudos_count, comments_count, has_kudoed, created_at, snippets } = session;
  const [showComments, setShowComments] = useState(false);
  const [showKudos, setShowKudos] = useState(false);
  const [playingSnippetId, setPlayingSnippetId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isOwnSession = currentUserId && session.user_id === currentUserId;
  const totalSeconds = duration_seconds + break_seconds;

  const handleKudoToggle = () => {
    onKudo?.(session.id);
  };

  const handleKudosListClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (kudos_count > 0) {
      setShowKudos(true);
    }
  };

  const handleCommentClick = () => {
    setShowComments(true);
    onComment?.(session.id);
  };

  const handlePlaySnippet = (snippetId: string, audioUrl: string) => {
    const audioElement = document.getElementById(`audio-${snippetId}`) as HTMLAudioElement;
    
    if (playingSnippetId === snippetId) {
      // Pause current and reset progress
      audioElement?.pause();
      audioElement.currentTime = 0;
      setPlayingSnippetId(null);
      setAudioProgress(0);
      audioRef.current = null;
    } else {
      // Stop any currently playing audio and reset it
      if (audioRef.current && playingSnippetId) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      // Play new audio
      if (audioElement) {
        audioRef.current = audioElement;
        setPlayingSnippetId(snippetId);
        setAudioProgress(0);
        audioElement.play();
      }
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

  return (
    <Card>
      {/* Header: User Info */}
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href={`/profile/${profile.username}`}>
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
              <AvatarFallback>
                {profile.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          
          <div className="flex-1">
            <Link 
              href={`/profile/${profile.username}`}
              className="font-semibold hover:underline"
            >
              {profile.display_name || profile.username}
            </Link>
            <p className="text-sm text-muted-foreground">
              {formatRelativeTime(created_at)}
            </p>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Music2 className="w-4 h-4" />
            <span className="text-sm font-medium">{instrument}</span>
          </div>

          {isOwnSession && (
            <Link href={`/session/${session.id}/edit`}>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>

        {/* Session Details */}
        <div className="space-y-3">
          {/* Duration - Prominent Display with Timeline */}
          <div className="bg-primary/10 rounded-lg p-4">
            <div className="text-center mb-3">
              <div className="text-3xl font-bold text-primary tabular-nums">
                {formatDuration(duration_seconds)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                practice time
              </div>
            </div>

            {/* Time breakdown - only show for recorded sessions */}
            {!session.is_manual_entry && (
              <div className="flex justify-center gap-4 text-xs text-muted-foreground mb-3">
                <span>Break: {formatDuration(break_seconds)}</span>
                <span>•</span>
                <span>Total: {formatDuration(totalSeconds)}</span>
              </div>
            )}
            
            {/* Show manual entry indicator */}
            {session.is_manual_entry && (
              <div className="flex justify-center gap-2 text-xs text-muted-foreground mb-3">
                <span className="text-orange-600 dark:text-orange-400">✎ Manual Entry</span>
              </div>
            )}

            {/* Timeline visualization */}
            <div className="relative h-3 bg-muted rounded-full overflow-hidden"
              title={session.is_manual_entry ? "Manual entry" : `Practice: ${formatDuration(duration_seconds)}${break_seconds > 0 ? ` | Break: ${formatDuration(break_seconds)}` : ''}`}
            >
              {/* Render timeline based on break_timeline */}
              {(() => {
                // Manual entry - show orange bar
                if (session.is_manual_entry) {
                  return (
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-amber-500"
                      style={{ width: '100%' }}
                    />
                  );
                }

                // Helper function to convert practice time to timeline position
                const practiceTimeToTimelinePosition = (practiceTimeSeconds: number): number => {
                  if (!session.break_timeline || session.break_timeline.length === 0) {
                    return practiceTimeSeconds;
                  }
                  
                  let timelinePosition = 0;
                  let practiceTimeAccumulated = 0;
                  
                  for (const breakEvent of session.break_timeline) {
                    const practiceBeforeBreak = breakEvent.start - timelinePosition;
                    
                    if (practiceTimeAccumulated + practiceBeforeBreak >= practiceTimeSeconds) {
                      // Snippet falls in this practice segment
                      return timelinePosition + (practiceTimeSeconds - practiceTimeAccumulated);
                    }
                    
                    practiceTimeAccumulated += practiceBeforeBreak;
                    timelinePosition = breakEvent.end;
                  }
                  
                  // Snippet is after all breaks
                  return timelinePosition + (practiceTimeSeconds - practiceTimeAccumulated);
                };
                
                if (!session.break_timeline || session.break_timeline.length === 0) {
                  // No break timeline data - fall back to simple two-segment view
                  if (break_seconds > 0) {
                    // Show practice then break
                    return (
                      <>
                        <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-emerald-500"
                          style={{ width: `${(duration_seconds / totalSeconds) * 100}%` }}
                        />
                        <div 
                          className="absolute top-0 h-full bg-gradient-to-r from-red-400 to-red-500"
                          style={{ 
                            left: `${(duration_seconds / totalSeconds) * 100}%`,
                            width: `${(break_seconds / totalSeconds) * 100}%`
                          }}
                        />
                      </>
                    );
                  } else {
                    // No breaks - simple practice segment
                    return (
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{ width: '100%' }}
                      />
                    );
                  }
                }
                
                // Build timeline segments from break events
                const segments: Array<{ type: 'practice' | 'break'; start: number; end: number }> = [];
                let currentTime = 0;
                
                session.break_timeline.forEach((breakEvent) => {
                  // Add practice segment before this break
                  if (breakEvent.start > currentTime) {
                    segments.push({ type: 'practice', start: currentTime, end: breakEvent.start });
                  }
                  // Add break segment
                  if (breakEvent.end > breakEvent.start) {
                    segments.push({ type: 'break', start: breakEvent.start, end: breakEvent.end });
                    currentTime = breakEvent.end;
                  }
                });
                
                // Add final practice segment if needed
                if (currentTime < totalSeconds) {
                  segments.push({ type: 'practice', start: currentTime, end: totalSeconds });
                }
                
                return segments.map((segment, idx) => {
                  const startPercent = (segment.start / totalSeconds) * 100;
                  const widthPercent = ((segment.end - segment.start) / totalSeconds) * 100;
                  return (
                    <div 
                      key={idx}
                      className={`absolute top-0 h-full ${
                        segment.type === 'practice' 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                          : 'bg-gradient-to-r from-red-400 to-red-500'
                      }`}
                      style={{ 
                        left: `${startPercent}%`,
                        width: `${widthPercent}%`
                      }}
                    />
                  );
                });
              })()}
            </div>
          </div>

          {/* Piece Name */}
          {piece_name && (
            <div>
              <p className="text-sm text-muted-foreground">Practiced:</p>
              <p className="font-medium">{piece_name}</p>
            </div>
          )}

          {/* Skills Practiced */}
          {skills_practiced && (
            <div>
              <p className="text-sm text-muted-foreground">Skills:</p>
              <p className="font-medium">{skills_practiced}</p>
            </div>
          )}

          {/* Indicators */}
          {(focus || entropy || enjoyment) && (
            <div className="flex flex-wrap gap-2">
              {focus && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  focus === "clear_goals" 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                    : focus === "mid"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}>
                  Focus: {focus === "clear_goals" ? "Clear Goals" : focus === "mid" ? "Mid" : "Noodling"}
                </span>
              )}
              {entropy && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  entropy === "few_measures" 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                    : entropy === "in_between"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}>
                  Entropy: {entropy === "few_measures" ? "Few Measures" : entropy === "in_between" ? "In Between" : "Whole Piece"}
                </span>
              )}
              {enjoyment && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  enjoyment === "progress" 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                    : enjoyment === "ok"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}>
                  Enjoyment: {enjoyment === "progress" ? "Progress" : enjoyment === "ok" ? "OK" : "Stuck"}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {description && (
            <p className="text-sm whitespace-pre-wrap">{description}</p>
          )}

          {/* Audio Snippets */}
          {snippets && snippets.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Captured Moment
                </span>
              </div>
              {snippets.map((snippet) => (
                <div key={snippet.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
                      onClick={() => handlePlaySnippet(snippet.id, snippet.audio_url)}
                    >
                      {playingSnippetId === snippet.id ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </Button>
                    
                    {/* Progress bar and time */}
                    <div className="flex-1">
                      <div className="relative h-2 bg-amber-200/30 dark:bg-amber-900/30 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-100"
                          style={{ 
                            width: playingSnippetId === snippet.id && audioDuration > 0
                              ? `${(audioProgress / audioDuration) * 100}%` 
                              : '0%'
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>
                          {playingSnippetId === snippet.id ? formatTime(audioProgress) : '0:00'}
                        </span>
                        <span>{formatTime(snippet.duration_ms / 1000)}</span>
                      </div>
                    </div>
                  </div>
                  <audio
                    id={`audio-${snippet.id}`}
                    src={snippet.audio_url}
                    preload="metadata"
                    onTimeUpdate={(e) => {
                      if (playingSnippetId === snippet.id) {
                        setAudioProgress(e.currentTarget.currentTime);
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      // Always set duration when metadata loads, not just when playing
                      setAudioDuration(e.currentTarget.duration);
                    }}
                    onEnded={() => {
                      setPlayingSnippetId(null);
                      setAudioProgress(0);
                      audioRef.current = null;
                    }}
                    className="hidden"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Footer: Engagement Actions */}
      <CardFooter className="flex items-center gap-4 border-t pt-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${has_kudoed ? 'text-red-500' : ''}`}
            onClick={handleKudoToggle}
          >
            <Heart className={`w-4 h-4 ${has_kudoed ? 'fill-current' : ''}`} />
            <span>Kudos</span>
          </Button>
          {kudos_count > 0 && (
            <button
              onClick={handleKudosListClick}
              className="text-sm text-muted-foreground hover:underline -ml-2"
            >
              {kudos_count}
            </button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={handleCommentClick}
        >
          <MessageCircle className="w-4 h-4" />
          <span>{comments_count > 0 ? comments_count : 'Comment'}</span>
        </Button>
      </CardFooter>

      {/* Modals */}
      <CommentsModal
        sessionId={session.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />
      
      <KudosModal
        sessionId={session.id}
        kudosCount={kudos_count}
        isOpen={showKudos}
        onClose={() => setShowKudos(false)}
      />
    </Card>
  );
}
