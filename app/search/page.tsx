import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { FollowButton } from "@/components/profile/follow-button";
import { searchUsers } from "@/lib/actions/profile";
import { getCurrentUser } from "@/lib/actions/auth";
import { normalizeSearchQuery, SEARCH_MAX_LENGTH } from "@/lib/search/query";
import { getAvatarInitials } from "@/lib/utils/avatar";
import { Lock, Music, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Search musicians · Virtuoso",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const rawQuery = typeof q === "string" ? q : "";
  const query = normalizeSearchQuery(rawQuery);

  const [currentUser, results] = await Promise.all([
    getCurrentUser(),
    query ? searchUsers(query) : Promise.resolve([]),
  ]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Find musicians</h1>

        <Form action="/search" role="search" className="relative mb-6">
          <label htmlFor="q" className="sr-only">
            Search by name or username
          </label>
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={rawQuery}
            placeholder="Search by name or @username"
            maxLength={SEARCH_MAX_LENGTH}
            autoComplete="off"
            autoFocus
            className="input-base pl-11 h-12 text-base"
          />
        </Form>

        {rawQuery && !query && (
          <p className="text-sm text-muted-foreground">Type at least 2 characters.</p>
        )}

        {query && (
          <section aria-live="polite">
            <p className="text-sm text-muted-foreground mb-3">
              {results.length === 0
                ? `No musicians match “${query}”.`
                : `${results.length} ${results.length === 1 ? "result" : "results"} for “${query}”`}
            </p>

            {results.length > 0 && (
              <Card>
                <CardContent className="p-2">
                  <ul className="divide-y divide-border/60">
                    {results.map((person) => (
                      <li key={person.id} className="flex items-center gap-4 p-3">
                        <Link href={`/profile/${person.username}`} className="shrink-0">
                          <Avatar className="w-11 h-11">
                            <AvatarImage src={person.avatar_url || undefined} alt="" />
                            <AvatarFallback>
                              {getAvatarInitials(person.display_name, person.username)}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/profile/${person.username}`}
                            className="font-medium text-sm hover:underline truncate block"
                          >
                            {person.display_name || person.username}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                            @{person.username}
                            {person.account_type === "private" && (
                              <span className="inline-flex items-center gap-1">
                                · <Lock className="w-3 h-3" aria-hidden="true" /> Private
                              </span>
                            )}
                          </p>
                          {person.primary_instrument && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Music className="w-3 h-3" aria-hidden="true" />
                              {person.primary_instrument}
                            </p>
                          )}
                        </div>
                        {currentUser && person.follow_status !== "self" && (
                          <FollowButton userId={person.id} followStatus={person.follow_status} size="sm" />
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
