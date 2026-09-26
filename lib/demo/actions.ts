"use server";

import { getDemoFeedPage, getDemoUserSessions } from "@/lib/demo/data";
import type { FeedPage } from "@/src/types";

// "Load more" for the demo feeds. Read-only: these only fetch demo sessions.

export async function loadMoreDemoFeed(cursor: string): Promise<FeedPage> {
  return getDemoFeedPage(cursor);
}

export async function loadMoreDemoUserSessions(userId: string, cursor: string): Promise<FeedPage> {
  return getDemoUserSessions(userId, cursor);
}
