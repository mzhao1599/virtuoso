import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { ALICE, ALICE_SESSION, CAROL, as, freshDb, rows, withUsers } from "./helpers";

const ADA = "d0000000-0000-4000-8000-000000000001";
const MIRA = "d0000000-0000-4000-8000-000000000003";

let db: PGlite;
let adaSession: string;
let commentOnAda: string;

beforeAll(async () => {
  db = await freshDb({ seed: true });
  await withUsers(db);
  [{ id: adaSession }] = await rows<{ id: string }>(
    db,
    "select id from sessions where user_id = $1 order by created_at desc limit 1",
    [ADA]
  );
  [{ id: commentOnAda }] = await rows<{ id: string }>(db, "select id from comments where session_id = $1 limit 1", [
    adaSession,
  ]);
});

describe("demo seed", () => {
  it("creates five fictional, public, read-only accounts that can't sign in", async () => {
    const people = await rows<{ username: string; account_type: string }>(
      db,
      "select username, account_type from profiles where is_demo order by username"
    );
    expect(people.map((p) => p.username)).toEqual([
      "ada_quaver",
      "jun_staccato",
      "mira_fermata",
      "rosa_cadenza",
      "theo_arpeggio",
    ]);
    expect(new Set(people.map((p) => p.account_type))).toEqual(new Set(["public"]));
    const auth = await rows<{ email: string; encrypted_password: string }>(
      db,
      "select email, encrypted_password from auth.users where id in (select id from profiles where is_demo)"
    );
    expect(auth.every((a) => a.email.endsWith(".invalid") && a.encrypted_password === "")).toBe(true);
  });

  it("has sessions, kudos, comments and clips, none in the future", async () => {
    const [counts] = await rows<Record<string, number>>(
      db,
      `select
        (select count(*)::int from sessions s join profiles p on p.id = s.user_id where p.is_demo) as sessions,
        (select count(*)::int from kudos) as kudos,
        (select count(*)::int from comments) as comments,
        (select count(*)::int from snippets) as clips,
        (select count(*)::int from sessions where created_at > now()) as future`
    );
    expect(counts.sessions).toBeGreaterThan(100);
    expect(counts.kudos).toBeGreaterThan(50);
    expect(counts.comments).toBeGreaterThan(5);
    expect(counts.clips).toBe(2);
    expect(counts.future).toBe(0);
  });

  it("gives every musician a timed latest session, with clips only on timed ones", async () => {
    const latest = await rows<{ is_manual_entry: boolean }>(
      db,
      `select s.is_manual_entry from sessions s join profiles p on p.id = s.user_id
       where p.is_demo and s.created_at = (select max(created_at) from sessions where user_id = s.user_id)`
    );
    expect(latest).toHaveLength(5);
    expect(latest.every((s) => !s.is_manual_entry)).toBe(true);
    const clipsOnManual = await rows(db, "select 1 from snippets sn join sessions s on s.id = sn.session_id where s.is_manual_entry");
    expect(clipsOnManual).toHaveLength(0);
  });

  it("can be re-run", async () => {
    await db.exec(readFileSync("supabase/seed/demo.sql", "utf8"));
    const [{ n }] = await rows<{ n: number }>(db, "select count(*)::int as n from profiles where is_demo");
    expect(n).toBe(5);
    [{ id: adaSession }] = await rows<{ id: string }>(
      db,
      "select id from sessions where user_id = $1 order by created_at desc limit 1",
      [ADA]
    );
    [{ id: commentOnAda }] = await rows<{ id: string }>(db, "select id from comments where session_id = $1 limit 1", [
      adaSession,
    ]);
  });
});

describe("demo data is read-only in the database", () => {
  it("is readable without signing in", async () => {
    const [counts] = await as(db, null, () =>
      rows<Record<string, number>>(
        db,
        `select (select count(*)::int from sessions) as sessions,
                (select count(*)::int from comments) as comments,
                (select count(*)::int from user_stats where is_demo) as stats`
      )
    );
    expect(counts.sessions).toBeGreaterThan(100);
    expect(counts.comments).toBeGreaterThan(5);
    expect(counts.stats).toBe(5);
  });

  it("refuses kudos, comments and follows from real users", async () => {
    await expect(
      as(db, CAROL, () => db.query("insert into kudos (user_id, session_id) values ($1, $2)", [CAROL, adaSession]))
    ).rejects.toThrow(/Demo kudos/);
    await expect(
      as(db, CAROL, () =>
        db.query("insert into comments (user_id, session_id, content) values ($1, $2, 'hi')", [CAROL, adaSession])
      )
    ).rejects.toThrow(/Demo comments/);
    await expect(
      as(db, CAROL, () => db.query("insert into follows (follower_id, following_id) values ($1, $2)", [CAROL, ADA]))
    ).rejects.toThrow(/Demo follows/);
    const updated = await as(db, CAROL, () => rows(db, "update profiles set bio = 'x' where id = $1 returning 1", [ADA]));
    expect(updated).toHaveLength(0);
  });

  it("refuses every write even for a session signed in as a demo user", async () => {
    await expect(
      as(db, ADA, () => db.query("insert into sessions (user_id, instrument, duration_seconds) values ($1, 'Piano', 60)", [ADA]))
    ).rejects.toThrow(/Demo sessions/);
    const writes = [
      [ADA, "update sessions set piece_name = 'x' where id = $1 returning 1", [adaSession]],
      [ADA, "delete from sessions where id = $1 returning 1", [adaSession]],
      [MIRA, "update comments set content = 'x' where id = $1 returning 1", [commentOnAda]],
      [MIRA, "delete from comments where id = $1 returning 1", [commentOnAda]],
      [ADA, "delete from follows where follower_id = $1 returning 1", [ADA]],
      [ADA, "delete from kudos where user_id = $1 returning 1", [ADA]],
      [ADA, "update profiles set bio = 'x' where id = $1 returning 1", [ADA]],
    ] as const;
    for (const [uid, sql, params] of writes) {
      expect(await as(db, uid, () => rows(db, sql, [...params]))).toHaveLength(0);
    }
  });

  it("stays out of search and doesn't block normal activity", async () => {
    expect(await as(db, CAROL, () => rows(db, "select * from search_profiles('ada')"))).toEqual([]);
    await expect(
      as(db, CAROL, () => db.query("insert into kudos (user_id, session_id) values ($1, $2)", [CAROL, ALICE_SESSION]))
    ).resolves.toBeDefined();
    const real = await as(db, CAROL, () =>
      rows<{ user_id: string }>(db, "select user_id from user_stats where not is_demo and total_sessions > 0")
    );
    expect(real.map((r) => r.user_id)).toEqual([ALICE]);
  });
});
