import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ROOT = process.cwd();

/**
 * A fresh in-memory Postgres (PGlite) with Supabase stand-ins, schema.sql
 * and every migration applied in filename order, like the README tells you
 * to run them. Optionally loads the demo seed.
 */
export async function freshDb({ seed = false } = {}): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(readFileSync(join(ROOT, "tests/db/supabase-stubs.sql"), "utf8"));
  await db.exec(readFileSync(join(ROOT, "supabase/schema.sql"), "utf8"));
  const dir = join(ROOT, "supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(join(dir, file), "utf8"));
    } catch (e) {
      throw new Error(`${file}: ${(e as Error).message}`);
    }
  }
  if (seed) await db.exec(readFileSync(join(ROOT, "supabase/seed/demo.sql"), "utf8"));
  return db;
}

/** Run queries as a signed-in user (uuid) or as the anon role (null), like PostgREST does. */
export async function as<T>(db: PGlite, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.query("select set_config('request.jwt.claim.role', $1, false)", [userId ? "authenticated" : "anon"]);
  await db.exec(userId ? "set role authenticated" : "set role anon");
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

export async function rows<T = Record<string, unknown>>(db: PGlite, sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows;
}

export async function createUser(db: PGlite, id: string, email: string, meta: Record<string, string> = {}) {
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [id, email, meta]);
}

export const ALICE = "aaaaaaaa-0000-4000-8000-000000000001"; // public
export const BOB = "bbbbbbbb-0000-4000-8000-000000000002"; // private
export const CAROL = "cccccccc-0000-4000-8000-000000000003"; // public
export const ALICE_SESSION = "11111111-0000-4000-8000-000000000001";
export const BOB_SESSION = "22222222-0000-4000-8000-000000000002";

/** Alice (public), Bob (private) and Carol, with one timed session each for Alice and Bob. */
export async function withUsers(db: PGlite) {
  await createUser(db, ALICE, "alice@example.com", { username: "alice" });
  await createUser(db, BOB, "bob@example.com", { username: "bob" });
  await createUser(db, CAROL, "carol@example.com", { username: "carol" });
  await db.exec(`update public.profiles set account_type = 'private' where id = '${BOB}'`);
  await db.query(
    "insert into public.sessions (id, user_id, instrument, duration_seconds) values ($1, $2, 'Piano', 600), ($3, $4, 'Cello', 1200)",
    [ALICE_SESSION, ALICE, BOB_SESSION, BOB]
  );
}
