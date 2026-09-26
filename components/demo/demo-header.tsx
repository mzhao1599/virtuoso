import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Info, Music } from "lucide-react";

/** Navbar for the public demo: no account, demo routes only. */
export function DemoHeader() {
  return (
    <header className="sticky top-0 z-40">
      <div className="bg-foreground text-background text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
          <p className="flex-1">
            <span className="font-semibold">Demo</span>
            <span className="opacity-80"> · fictional musicians and data, read-only. Nothing here can be changed.</span>
          </p>
        </div>
      </div>
      <nav aria-label="Demo" className="bg-white/80 backdrop-blur-md shadow-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg shrink-0">
            <span className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <Music className="w-4 h-4 text-primary" aria-hidden="true" />
            </span>
            <span className="tracking-tight">Virtuoso</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/demo"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
            >
              Feed
            </Link>
            <Link
              href="/demo/leaderboard"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
            >
              Leaderboard
            </Link>
          </div>
          <div className="flex-1" />
          <Button asChild size="sm">
            <Link href="/login">
              <span className="sm:hidden">Sign in</span>
              <span className="hidden sm:inline">Track your own practice</span>
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
