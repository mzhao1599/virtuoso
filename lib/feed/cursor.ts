/**
 * Keyset pagination cursor for session lists ordered by (created_at, id)
 * descending. The cursor comes back from the browser, so it is parsed
 * strictly before it is used in a PostgREST filter.
 */

export const FEED_PAGE_SIZE = 20;

const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FeedCursor {
  /** created_at exactly as Postgres returned it (keeps microseconds) */
  createdAt: string;
  id: string;
}

export function encodeCursor(row: { created_at: string; id: string }): string {
  return `${row.created_at}~${row.id}`;
}

export function parseCursor(value: unknown): FeedCursor | null {
  if (typeof value !== "string" || value.length > 80) return null;
  const [createdAt, id, extra] = value.split("~");
  if (extra !== undefined || !createdAt || !id) return null;
  if (!TIMESTAMP_RE.test(createdAt) || Number.isNaN(Date.parse(createdAt))) return null;
  if (!UUID_RE.test(id)) return null;
  return { createdAt, id };
}

/**
 * PostgREST `or` filter for "rows after this cursor" in (created_at desc, id desc)
 * order. Values are double-quoted because timestamps contain `:` `.` and `+`.
 */
export function cursorFilter(cursor: FeedCursor): string {
  const ts = `"${cursor.createdAt}"`;
  return `created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${cursor.id})`;
}
