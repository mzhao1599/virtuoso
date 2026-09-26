import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { StringRings } from "@/components/landing/string-rings";
import { PluckDivider } from "@/components/landing/pluck-divider";
import { Bell, CalendarDays, Clock, Mic, Search, Target, Trophy, Users } from "lucide-react";

export default function HomePage() {
  return (
    <AppLayout>
      {/* Hero */}
      <section className="relative bg-ebony text-white overflow-hidden" aria-labelledby="hero-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 lg:py-20 grid gap-10 lg:grid-cols-[1.05fr_1fr] items-center">
          <div className="space-y-7 animate-fade-in">
            <p className="eyebrow !text-brass">Strava for musicians</p>
            <h1 id="hero-heading" className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-balance">
              Keep the take you <em className="text-brass">just</em> played.
            </h1>
            <p className="text-lg text-white/75 leading-relaxed max-w-xl text-pretty">
              Virtuoso times your practice, keeps the last 30 seconds of what you played so you can save a good
              take after the fact, and lets friends follow along with kudos, comments, streaks and weekly goals.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button size="lg" asChild className="bg-brass text-ebony hover:bg-brass/90">
                <Link href="/login">Get started</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="bg-transparent border-white/25 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/demo">Explore the demo</Link>
              </Button>
            </div>
            <p className="text-sm text-white/50">Free. Sign in with Google. The demo needs no account.</p>
          </div>

          <div className="w-full max-w-[520px] mx-auto">
            <StringRings />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20" aria-labelledby="features-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="eyebrow">What it does</p>
          <h2 id="features-heading" className="font-serif text-4xl sm:text-5xl mt-2 max-w-2xl text-balance">
            A practice log that notices the good days.
          </h2>
          <PluckDivider className="w-48 h-5 text-brass mt-6" />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-10">
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="Timer with breaks"
              description="Start, pause for a break, finish. Virtuoso records when each break happened, then asks what you worked on and how it went."
            />
            <FeatureCard
              icon={<Mic className="w-5 h-5" />}
              title="Capture the last 30 seconds"
              description="While the timer runs, the mic fills a rolling buffer. One click saves what you just played and attaches it to the session."
            />
            <FeatureCard
              icon={<Target className="w-5 h-5" />}
              title="Weekly goals and streaks"
              description="Set hours per week and see how far along you are, how much a day it takes to finish, and your current streak."
            />
            <FeatureCard
              icon={<CalendarDays className="w-5 h-5" />}
              title="Calendar and per-piece totals"
              description="A heatmap of every practice day, and how much time each piece has had, so you know where the hours went."
            />
            <FeatureCard
              icon={<Users className="w-5 h-5" />}
              title="Feed, kudos and comments"
              description="Follow friends, give kudos, comment on sessions. Private accounts approve their followers."
            />
            <FeatureCard
              icon={<Trophy className="w-5 h-5" />}
              title="Leaderboard and search"
              description="Rank by practice time, sessions or days practiced, and find people by name. Notifications tell you who reacted."
            />
          </div>
        </div>
      </section>

      {/* How capture works */}
      <section className="py-20 bg-white border-y border-border" aria-labelledby="capture-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid gap-12 lg:grid-cols-[1fr_1.2fr] items-start">
          <div>
            <p className="eyebrow">Under the hood</p>
            <h2 id="capture-heading" className="font-serif text-4xl sm:text-5xl mt-2 text-balance">
              How &ldquo;capture&rdquo; works
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
              You rarely know a take is good until it&apos;s over. So Virtuoso never starts recording: it is
              always recording, into a fixed 30-second loop that overwrites itself.
            </p>
          </div>
          <ol className="space-y-6">
            <Step n={1} title="A ring buffer, filled in real time">
              An AudioWorklet writes microphone samples into a preallocated circular buffer sized for 30 seconds.
              Nothing is allocated while audio runs; the oldest sample is simply overwritten.
            </Step>
            <Step n={2} title="Capture copies it out, oldest first">
              When you press capture, the buffer is unrolled from the write position so it plays in order, mixed to
              mono and downsampled to 22.05 kHz.
            </Step>
            <Step n={3} title="Saved privately with the session">
              The clip is encoded as a WAV and stored in private storage. Anyone who can see the session gets a
              short-lived link to play it.
            </Step>
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" aria-labelledby="cta-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 id="cta-heading" className="font-serif text-4xl sm:text-5xl text-balance">
            See it with fictional musicians first.
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            The demo is a read-only copy of the app with five made-up players and eight weeks of practice:
            the feed, profiles with streaks and goals, comments and the leaderboard.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/demo">Explore the demo</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in with Google</Link>
            </Button>
          </div>
          <div className="mt-8 flex justify-center gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Search className="w-4 h-4" aria-hidden="true" /> Search
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Bell className="w-4 h-4" aria-hidden="true" /> Notifications
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Target className="w-4 h-4" aria-hidden="true" /> Goals
            </span>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="font-serif text-lg text-foreground">Virtuoso</span>
          <span>
            MIT licensed ·{" "}
            <a href="https://github.com/mzhao1599/virtuoso" className="underline underline-offset-4 hover:text-foreground">
              Source on GitHub
            </a>
          </span>
        </div>
      </footer>
    </AppLayout>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card p-6 rounded-2xl border border-border hover:border-primary/30 transition-colors">
      <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        className="shrink-0 w-9 h-9 rounded-full border-2 border-primary/30 text-primary font-semibold flex items-center justify-center tabular-nums"
        aria-hidden="true"
      >
        {n}
      </span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mt-1">{children}</p>
      </div>
    </li>
  );
}
