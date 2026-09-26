export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 50;

/**
 * Clean up a user-typed search query before it is sent to search_profiles().
 * Returns null when there is nothing worth searching for.
 *
 * - accepts only strings (form data and URL params can be anything)
 * - Unicode-normalizes, drops control characters, collapses whitespace
 * - strips a leading "@" so "@ada" finds the username "ada"
 * - caps the length at SEARCH_MAX_LENGTH
 *
 * Escaping of LIKE wildcards happens in SQL, where the query is a bound parameter.
 */
export function normalizeSearchQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const query = raw
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^@+/, "")
    .slice(0, SEARCH_MAX_LENGTH)
    .trim();

  return query.length >= SEARCH_MIN_LENGTH ? query : null;
}
