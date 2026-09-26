export interface PieceTotal {
  /** Name as most recently written */
  name: string;
  seconds: number;
  sessions: number;
  lastPracticedAt: string;
}

/** Group key: case-insensitive, whitespace-collapsed. */
export function pieceKey(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

/**
 * Total practice time per piece, most practiced first (ties: most recent
 * first). "Bach  prelude" and "bach prelude" count as the same piece.
 * Sessions without a piece name are left out.
 */
export function pieceTotals(
  entries: ReadonlyArray<{ piece_name: string | null; duration_seconds: number; created_at: string }>
): PieceTotal[] {
  const byKey = new Map<string, PieceTotal>();

  for (const entry of entries) {
    if (!entry.piece_name) continue;
    const key = pieceKey(entry.piece_name);
    if (!key) continue;

    const existing = byKey.get(key);
    const displayName = entry.piece_name.trim().replace(/\s+/g, " ");
    if (!existing) {
      byKey.set(key, {
        name: displayName,
        seconds: Math.max(0, entry.duration_seconds),
        sessions: 1,
        lastPracticedAt: entry.created_at,
      });
      continue;
    }

    existing.seconds += Math.max(0, entry.duration_seconds);
    existing.sessions += 1;
    if (new Date(entry.created_at) > new Date(existing.lastPracticedAt)) {
      existing.lastPracticedAt = entry.created_at;
      existing.name = displayName;
    }
  }

  return [...byKey.values()].sort(
    (a, b) =>
      b.seconds - a.seconds ||
      new Date(b.lastPracticedAt).getTime() - new Date(a.lastPracticedAt).getTime()
  );
}
