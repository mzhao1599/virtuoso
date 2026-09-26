import Link from "next/link";
import { Feed } from "@/components/sessions/feed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoUnavailable } from "@/components/demo/demo-unavailable";
import { loadMoreDemoFeed } from "@/lib/demo/actions";
import { getDemoFeedPage, getDemoMusicians } from "@/lib/demo/data";
import { getAvatarInitials } from "@/lib/utils/avatar";
import { Music } from "lucide-react";

// Anonymous, cookie-less reads: cache the page and refresh it every 5 minutes.
export const revalidate = 300;

export default async function DemoFeedPage() {
  const [page, musicians] = await Promise.all([getDemoFeedPage(), getDemoMusicians()]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 grid gap-8 lg:grid-cols-[1fr_280px]">
      <section aria-labelledby="demo-feed-heading" className="min-w-0">
        <h1 id="demo-feed-heading" className="text-2xl font-semibold tracking-tight">
          Demo feed
        </h1>
        <p className="text-sm text-muted-foreground mt-1 mb-8">
          What five fictional musicians have been practicing. Open a session to see its comments, or a profile
          for streaks, weekly goals and per-piece totals.
        </p>
        {page.sessions.length === 0 ? (
          <DemoUnavailable />
        ) : (
          <Feed initialPage={page} loadMore={loadMoreDemoFeed} emptyContext="other-profile" />
        )}
      </section>

      {musicians.length > 0 && (
        <aside className="lg:pt-16">
          <Card className="lg:sticky lg:top-36">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Musicians</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ul>
                {musicians.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/demo/profile/${m.username}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/60 transition-colors"
                    >
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={m.avatar_url || undefined} alt="" />
                        <AvatarFallback className="text-xs">
                          {getAvatarInitials(m.display_name, m.username)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate">{m.display_name || m.username}</span>
                        {m.primary_instrument && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Music className="w-3 h-3" aria-hidden="true" /> {m.primary_instrument}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      )}
    </div>
  );
}
