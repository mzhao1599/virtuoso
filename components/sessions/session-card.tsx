"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAppLinks } from "@/components/app-links";
import { KudosModal } from "./kudos-modal";
import { toggleKudo } from "@/lib/actions/sessions";
import { cn, formatHoursMinutes } from "@/lib/utils";
import { LocalTime } from "@/components/ui/local-time";
import { getAvatarInitials } from "@/lib/utils/avatar";
import type { BreakEvent, FeedSession, FeedSnippet } from "@/src/types";
import { Heart, MessageCircle, Music2, Pause, PenLine, Pencil, Play } from "lucide-react";

interface SessionCardProps {
  session: FeedSession;
  currentUserId?: string;
}

const FOCUS_LABELS = { clear_goals: "Clear goals", mid: "Mid", noodling: "Noodling" } as const;
const ENTROPY_LABELS = { few_measures: "Few measures", in_between: "In between", whole_piece: "Whole piece" } as const;
const ENJOYMENT_LABELS = { progress: "Progress", ok: "OK", stuck: "Stuck" } as const;

export function SessionCard({ session, currentUserId }: SessionCardProps) {
  const {
    profile,
    instrument,
    duration_seconds,
    break_seconds,
    piece_name,
    skills_practiced,
    description,
    focus,
    entropy,
    enjoyment,
    comments_count,
    created_at,
    snippets,
  } = session;
  const { showToast } = useToast();
  const links = useAppLinks();
  const canKudo = !!currentUserId && !links.readOnly;
  const [kudos, setKudos] = useState({ given: session.has_kudoed, count: session.kudos_count });
  const [kudoPending, setKudoPending] = useState(false);
  const [showKudos, setShowKudos] = useState(false);

  const isOwnSession = !links.readOnly && !!currentUserId && session.user_id === currentUserId;
  const authorName = profile.display_name || profile.username;
  const playable = (snippets ?? []).filter((s) => s.playback_url);

  // Optimistic: flip immediately, roll back if the server rejects it.
  const handleKudoToggle = async () => {
    if (!canKudo || kudoPending) return;
    const previous = kudos;
    setKudos({ given: !previous.given, count: previous.count + (previous.given ? -1 : 1) });
    setKudoPending(true);
    try {
      await toggleKudo(session.id);
    } catch {
      setKudos(previous);
      showToast("Couldn't update kudos. Please try again.", "error");
    } finally {
      setKudoPending(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <article aria-label={`${authorName}'s ${instrument} session`}>
        {/* Author */}
        <header className="flex items-center gap-3 px-5 pt-5">
          <Link href={links.profile(profile.username)} className="shrink-0 rounded-full" tabIndex={-1} aria-hidden="true">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile.avatar_url || undefined} alt="" />
              <AvatarFallback>{getAvatarInitials(profile.display_name, profile.username)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={links.profile(profile.username)} className="font-semibold text-sm hover:underline">
              {authorName}
            </Link>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Link href={links.session(session.id)} className="hover:underline">
                <LocalTime date={created_at} />
              </Link>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Music2 className="w-3 h-3" aria-hidden="true" />
                {instrument}
              </span>
            </p>
          </div>
          {isOwnSession && (
            <Link
              href={`/session/${session.id}/edit`}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Edit session"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          )}
        </header>

        {/* Title + stats */}
        <div className="px-5 pt-4">
          <h3 className="text-lg font-semibold leading-snug text-balance">
            <Link href={links.session(session.id)} className="hover:underline decoration-primary/40 underline-offset-4">
              {piece_name || `${instrument} practice`}
            </Link>
          </h3>
          {skills_practiced && <p className="text-sm text-muted-foreground mt-0.5">{skills_practiced}</p>}

          <dl className="mt-4 grid grid-cols-3 gap-4 max-w-sm">
            <Stat label="Practice" value={formatHoursMinutes(duration_seconds)} strong />
            {session.is_manual_entry ? (
              <div className="col-span-2 self-end">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <PenLine className="w-3.5 h-3.5" aria-hidden="true" /> Entered by hand
                </span>
              </div>
            ) : (
              <>
                <Stat label="Breaks" value={formatHoursMinutes(break_seconds)} />
                <Stat label="Total" value={formatHoursMinutes(duration_seconds + break_seconds)} />
              </>
            )}
          </dl>

          {!session.is_manual_entry && (
            <SessionTimeline
              durationSeconds={duration_seconds}
              breakSeconds={break_seconds}
              breaks={session.break_timeline}
            />
          )}
        </div>

        {/* Notes */}
        {(focus || entropy || enjoyment || description) && (
          <div className="px-5 pt-4 space-y-3">
            {(focus || entropy || enjoyment) && (
              <ul className="flex flex-wrap gap-2" aria-label="Self-ratings">
                {focus && <Rating label="Focus" value={FOCUS_LABELS[focus]} tone={toneOf(focus, "clear_goals", "mid")} />}
                {entropy && (
                  <Rating label="Entropy" value={ENTROPY_LABELS[entropy]} tone={toneOf(entropy, "few_measures", "in_between")} />
                )}
                {enjoyment && (
                  <Rating label="Enjoyment" value={ENJOYMENT_LABELS[enjoyment]} tone={toneOf(enjoyment, "progress", "ok")} />
                )}
              </ul>
            )}
            {description && (
              <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{description}</p>
            )}
          </div>
        )}

        {/* Captured moment */}
        {playable.map((snippet) => (
          <div key={snippet.id} className="px-5 pt-4">
            <ClipPlayer snippet={snippet} synthesized={links.demo} />
          </div>
        ))}

        {/* Engagement */}
        <footer className="mt-4 flex items-center gap-1 border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={handleKudoToggle}
            disabled={!canKudo}
            aria-pressed={canKudo ? kudos.given : undefined}
            title={links.readOnly ? "The demo is read-only" : currentUserId ? undefined : "Sign in to give kudos"}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium transition-colors",
              kudos.given ? "text-rose-600" : "text-muted-foreground",
              canKudo ? "hover:bg-accent hover:text-foreground" : "cursor-default"
            )}
          >
            <Heart
              className={cn("w-4 h-4 transition-transform", kudos.given && "fill-current scale-110")}
              aria-hidden="true"
            />
            {canKudo ? (kudos.given ? "Kudos given" : "Give kudos") : "Kudos"}
          </button>
          {kudos.count > 0 && (
            <button
              type="button"
              onClick={() => setShowKudos(true)}
              className="h-9 px-2 rounded-full text-sm text-muted-foreground hover:text-foreground hover:underline tabular-nums"
              aria-label={`${kudos.count} ${kudos.count === 1 ? "person gave" : "people gave"} kudos, show who`}
            >
              {kudos.count}
            </button>
          )}

          <Link
            href={`${links.session(session.id)}#comments`}
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            {comments_count > 0
              ? `${comments_count} ${comments_count === 1 ? "comment" : "comments"}`
              : links.readOnly
                ? "Comments"
                : "Comment"}
          </Link>
        </footer>
      </article>

      <KudosModal
        sessionId={session.id}
        kudosCount={kudos.count}
        isOpen={showKudos}
        onClose={() => setShowKudos(false)}
      />
    </Card>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums tracking-tight", strong ? "text-2xl font-bold text-primary" : "text-lg font-semibold")}>
        {value}
      </dd>
    </div>
  );
}

type Tone = "good" | "mid" | "low";

function toneOf(value: string, good: string, mid: string): Tone {
  return value === good ? "good" : value === mid ? "mid" : "low";
}

function Rating({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        tone === "good" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        tone === "mid" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "low" && "border-rose-200 bg-rose-50 text-rose-800"
      )}
    >
      <span className="opacity-75">{label}</span>
      <span className="font-semibold">{value}</span>
    </li>
  );
}

/** Practice and breaks along the session, in the order they happened. */
function SessionTimeline({
  durationSeconds,
  breakSeconds,
  breaks,
}: {
  durationSeconds: number;
  breakSeconds: number;
  breaks: BreakEvent[] | null;
}) {
  const total = durationSeconds + breakSeconds;
  if (total <= 0) return null;

  const segments: Array<{ kind: "practice" | "break"; start: number; end: number }> = [];
  if (breaks && breaks.length > 0) {
    let t = 0;
    for (const b of breaks) {
      if (b.start > t) segments.push({ kind: "practice", start: t, end: b.start });
      if (b.end > b.start) {
        segments.push({ kind: "break", start: b.start, end: b.end });
        t = b.end;
      }
    }
    if (t < total) segments.push({ kind: "practice", start: t, end: total });
  } else {
    segments.push({ kind: "practice", start: 0, end: durationSeconds });
    if (breakSeconds > 0) segments.push({ kind: "break", start: durationSeconds, end: total });
  }

  const breakCount = segments.filter((s) => s.kind === "break").length;
  return (
    <div className="mt-4">
      <div
        className="flex h-2 gap-[2px] rounded-full overflow-hidden"
        role="img"
        aria-label={
          breakCount > 0
            ? `Timeline: ${breakCount} ${breakCount === 1 ? "break" : "breaks"} during the session`
            : "Timeline: practiced without breaks"
        }
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            className={seg.kind === "practice" ? "bg-primary/80" : "bg-brass/70"}
            style={{ flexGrow: Math.max(0.001, seg.end - seg.start) }}
          />
        ))}
      </div>
      {breakCount > 0 && (
        <p className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground" aria-hidden="true">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary/80" /> Practice
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-brass/70" /> Break
          </span>
        </p>
      )}
    </div>
  );
}

function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Play/pause for a captured clip, with progress. */
function ClipPlayer({ snippet, synthesized }: { snippet: FeedSnippet; synthesized: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(snippet.duration_ms / 1000);
  const [failed, setFailed] = useState(false);

  // Only one clip plays at a time across the page
  useEffect(() => {
    const onOtherPlay = (e: Event) => {
      if (e.target !== audioRef.current) audioRef.current?.pause();
    };
    document.addEventListener("play", onOtherPlay, true);
    return () => document.removeEventListener("play", onOtherPlay, true);
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setFailed(true);
      }
    } else {
      audio.pause();
    }
  };

  const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const capturedAt = formatClock(snippet.start_time_ms / 1000);

  return (
    <div className="rounded-xl border border-brass/30 bg-brass/[0.07] p-3 flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={failed}
        aria-label={playing ? "Pause captured clip" : "Play captured clip"}
        className="relative shrink-0 w-10 h-10 rounded-full bg-brass text-ebony flex items-center justify-center hover:brightness-105 active:scale-95 transition disabled:opacity-50"
      >
        {playing && (
          <span
            className="absolute inset-0 rounded-full border-2 border-brass motion-safe:animate-[capture-ring_1.6s_ease-out_infinite]"
            aria-hidden="true"
          />
        )}
        {playing ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4 ml-0.5" aria-hidden="true" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-brass-foreground">
          Captured moment{" "}
          <span className="font-normal text-muted-foreground">
            · at {capturedAt}
            {synthesized && " · synthesized demo audio"}
          </span>
        </p>
        <div className="mt-1.5 h-1.5 rounded-full bg-brass/20 overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full bg-brass transition-[width] duration-150 ease-linear" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground" aria-live="off">
          <span>{formatClock(position)}</span>
          <span>{failed ? "Clip unavailable" : formatClock(duration)}</span>
        </p>
      </div>
      <audio
        ref={audioRef}
        src={snippet.playback_url ?? undefined}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPosition(0);
        }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration);
        }}
        onError={() => setFailed(true)}
        className="hidden"
      />
    </div>
  );
}
