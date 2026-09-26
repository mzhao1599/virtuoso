"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Music2, Edit, Play, Pause, Sparkles } from "lucide-react";
import Link from "next/link";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import { getAvatarInitials } from "@/lib/utils/avatar";
import { CommentsModal } from "./comments-modal";
import { KudosModal } from "./kudos-modal";
import { useState, useRef } from "react";
import type { FeedSession } from "@/src/types";

interface SessionCardProps {
  session: FeedSession;
  currentUserId?: string;
  onKudo?: (sessionId: string) => void;
}

export function SessionCard({ session, currentUserId, onKudo }: SessionCardProps) {
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
  };

  const handlePlaySnippet = (snippetId: string) => {
    const audioElement = document.getElementById(`audio-${snippetId}`) as HTMLAudioElement;

    if (playingSnippetId === snippetId) {
      audioElement?.pause();
      audioElement.currentTime = 0;
      setPlayingSnippetId(null);
      setAudioProgress(0);
      audioRef.current = null;
    } else {
      if (audioRef.current && playingSnippetId) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

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

  const getIndicatorStyle = (value: string, goodValue: string, midValue: string) => {
    if (value === goodValue) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (value === midValue) return "bg-amber-50 text-amber-700 border border-amber-200";
    return "bg-rose-50 text-rose-700 border border-rose-200";
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
                {getAvatarInitials(profile.display_name, profile.username)}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <Link
              href={`/profile/${profile.username}`}
              className="font-medium text-sm hover:underline"
            >
              {profile.display_name || profile.username}
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(created_at)}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
            <Music2 className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{instrument}</span>
          </div>

          {isOwnSession && (
            <Link href={`/session/${session.id}/edit`}>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full">
                <Edit className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>

        {/* Session Details */}
        <div className="space-y-3">
          {/* Duration - Prominent Display with Timeline */}
          <div className="bg-primary/5 rounded-xl p-4">
            <div className="text-center mb-3">
              <div className="text-3xl font-bold text-primary tabular-nums tracking-tight">
                {formatDuration(duration_seconds)}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">
                practice time
              </div>
            </div>

            {/* Time breakdown */}
            {!session.is_manual_entry && (
              <div className="flex justify-center gap-4 text-xs text-muted-foreground mb-3">
                <span>Break: {formatDuration(break_seconds)}</span>
                <span className="text-border">•</span>
                <span>Total: {formatDuration(totalSeconds)}</span>
              </div>
            )}

            {session.is_manual_entry && (
              <div className="flex justify-center gap-2 text-xs text-muted-foreground mb-3">
                <span className="text-amber-600">✎ Manual Entry</span>
              </div>
            )}

            {/* Timeline visualization */}
            <div className="relative h-2 bg-muted/40 rounded-full overflow-hidden"
              title={session.is_manual_entry ? "Manual entry" : `Practice: ${formatDuration(duration_seconds)}${break_seconds > 0 ? ` | Break: ${formatDuration(break_seconds)}` : ''}`}
            >
              {(() => {
                if (session.is_manual_entry) {
                  return (
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                      style={{ width: '100%' }}
                    />
                  );
                }

                if (!session.break_timeline || session.break_timeline.length === 0) {
                  if (break_seconds > 0) {
                    return (
                      <>
                        <div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                          style={{ width: `${(duration_seconds / totalSeconds) * 100}%` }}
                        />
                        <div
                          className="absolute top-0 h-full bg-gradient-to-r from-rose-300 to-rose-400 rounded-full"
                          style={{
                            left: `${(duration_seconds / totalSeconds) * 100}%`,
                            width: `${(break_seconds / totalSeconds) * 100}%`
                          }}
                        />
                      </>
                    );
                  } else {
                    return (
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                        style={{ width: '100%' }}
                      />
                    );
                  }
                }

                const segments: Array<{ type: 'practice' | 'break'; start: number; end: number }> = [];
                let currentTime = 0;

                session.break_timeline.forEach((breakEvent) => {
                  if (breakEvent.start > currentTime) {
                    segments.push({ type: 'practice', start: currentTime, end: breakEvent.start });
                  }
                  if (breakEvent.end > breakEvent.start) {
                    segments.push({ type: 'break', start: breakEvent.start, end: breakEvent.end });
                    currentTime = breakEvent.end;
                  }
                });

                if (currentTime < totalSeconds) {
                  segments.push({ type: 'practice', start: currentTime, end: totalSeconds });
                }

                return segments.map((segment, idx) => {
                  const startPercent = (segment.start / totalSeconds) * 100;
                  const widthPercent = ((segment.end - segment.start) / totalSeconds) * 100;
                  return (
                    <div
                      key={idx}
                      className={`absolute top-0 h-full ${segment.type === 'practice'
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                          : 'bg-gradient-to-r from-rose-300 to-rose-400'
                        } ${idx === 0 ? 'rounded-l-full' : ''} ${idx === segments.length - 1 ? 'rounded-r-full' : ''}`}
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
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Practiced</p>
              <p className="text-sm font-medium mt-0.5">{piece_name}</p>
            </div>
          )}

          {/* Skills Practiced */}
          {skills_practiced && (
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Skills</p>
              <p className="text-sm font-medium mt-0.5">{skills_practiced}</p>
            </div>
          )}

          {/* Indicators */}
          {(focus || entropy || enjoyment) && (
            <div className="flex flex-wrap gap-2">
              {focus && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getIndicatorStyle(focus, "clear_goals", "mid")}`}>
                  Focus: {focus === "clear_goals" ? "Clear Goals" : focus === "mid" ? "Mid" : "Noodling"}
                </span>
              )}
              {entropy && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getIndicatorStyle(entropy, "few_measures", "in_between")}`}>
                  Entropy: {entropy === "few_measures" ? "Few Measures" : entropy === "in_between" ? "In Between" : "Whole Piece"}
                </span>
              )}
              {enjoyment && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getIndicatorStyle(enjoyment, "progress", "ok")}`}>
                  Enjoyment: {enjoyment === "progress" ? "Progress" : enjoyment === "ok" ? "OK" : "Stuck"}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {description && (
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{description}</p>
          )}

          {/* Audio Snippets */}
          {snippets && snippets.some((s) => s.playback_url) && (
            <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                  Captured Moment
                </span>
              </div>
              {snippets.filter((s) => s.playback_url).map((snippet) => (
                <div key={snippet.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      className="w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors"
                      onClick={() => handlePlaySnippet(snippet.id)}
                    >
                      {playingSnippetId === snippet.id ? (
                        <Pause className="w-4 h-4 text-amber-700" />
                      ) : (
                        <Play className="w-4 h-4 text-amber-700 ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="relative h-1.5 bg-amber-100 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-100"
                          style={{
                            width: playingSnippetId === snippet.id && audioDuration > 0
                              ? `${(audioProgress / audioDuration) * 100}%`
                              : '0%'
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-medium tabular-nums">
                        <span>
                          {playingSnippetId === snippet.id ? formatTime(audioProgress) : '0:00'}
                        </span>
                        <span>{formatTime(snippet.duration_ms / 1000)}</span>
                      </div>
                    </div>
                  </div>
                  <audio
                    id={`audio-${snippet.id}`}
                    src={snippet.playback_url ?? undefined}
                    preload="metadata"
                    onTimeUpdate={(e) => {
                      if (playingSnippetId === snippet.id) {
                        setAudioProgress(e.currentTarget.currentTime);
                      }
                    }}
                    onLoadedMetadata={(e) => {
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
      <CardFooter className="flex items-center gap-4 border-t border-border/50 pt-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 rounded-full ${has_kudoed ? 'text-red-500' : ''}`}
            onClick={handleKudoToggle}
          >
            <Heart className={`w-4 h-4 ${has_kudoed ? 'fill-current' : ''}`} />
            <span className="text-xs">Kudos</span>
          </Button>
          {kudos_count > 0 && (
            <button
              onClick={handleKudosListClick}
              className="text-xs text-muted-foreground hover:underline -ml-1"
            >
              {kudos_count}
            </button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-full"
          onClick={handleCommentClick}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs">{comments_count > 0 ? comments_count : 'Comment'}</span>
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
