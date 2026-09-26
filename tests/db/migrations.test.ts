import type { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ALICE,
  ALICE_SESSION,
  BOB,
  BOB_SESSION,
  CAROL,
  as,
  createUser,
  freshDb,
  rows,
  withUsers,
} from "./helpers";

// These run the real SQL (schema.sql + migrations) in PGlite with small
// stand-ins for Supabase's auth and storage schemas (supabase-stubs.sql).
// They check the database rules, not the Supabase services themselves.

let db: PGlite;

beforeEach(async () => {
  db = await freshDb();
  await withUsers(db);
});

describe("kudos and comments follow session visibility (008)", () => {
  beforeEach(async () => {
    await db.query("insert into kudos (user_id, session_id) values ($1, $2)", [BOB, BOB_SESSION]);
    await db.query("insert into comments (user_id, session_id, content) values ($1, $2, 'private note')", [BOB, BOB_SESSION]);
  });

  it("hides them from people who can't see the private session", async () => {
    expect(await as(db, CAROL, () => rows(db, "select * from kudos"))).toHaveLength(0);
    expect(await as(db, null, () => rows(db, "select * from comments"))).toHaveLength(0);
  });

  it("shows them to the owner and to accepted followers", async () => {
    expect(await as(db, BOB, () => rows(db, "select * from comments"))).toHaveLength(1);
    await db.query("insert into follows (follower_id, following_id) values ($1, $2)", [CAROL, BOB]);
    expect(await as(db, CAROL, () => rows(db, "select * from comments"))).toHaveLength(0); // still pending
    await db.query("update follows set status = 'accepted'");
    expect(await as(db, CAROL, () => rows(db, "select * from comments"))).toHaveLength(1);
  });

  it("rejects kudos and comments on sessions you can't see", async () => {
    await expect(
      as(db, CAROL, () => db.query("insert into kudos (user_id, session_id) values ($1, $2)", [CAROL, BOB_SESSION]))
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(db, CAROL, () =>
        db.query("insert into comments (user_id, session_id, content) values ($1, $2, 'hi')", [CAROL, BOB_SESSION])
      )
    ).rejects.toThrow(/row-level security/);
  });

  it("lets comment authors edit only the text", async () => {
    await as(db, CAROL, () =>
      db.query("insert into comments (user_id, session_id, content) values ($1, $2, 'nice')", [CAROL, ALICE_SESSION])
    );
    const edited = await as(db, CAROL, () =>
      rows(db, "update comments set content = 'nice!' where user_id = $1 returning content", [CAROL])
    );
    expect(edited).toEqual([{ content: "nice!" }]);
    await expect(
      as(db, CAROL, () => db.query("update comments set session_id = $1 where user_id = $2", [BOB_SESSION, CAROL]))
    ).rejects.toThrow(/permission denied/);
    const byOther = await as(db, ALICE, () => rows(db, "update comments set content = 'x' where user_id = $1 returning 1", [CAROL]));
    expect(byOther).toHaveLength(0);
  });

  it("keeps pending follow requests between the two people", async () => {
    await db.query("insert into follows (follower_id, following_id) values ($1, $2)", [CAROL, BOB]);
    expect(await as(db, ALICE, () => rows(db, "select * from follows"))).toHaveLength(0);
    expect(await as(db, BOB, () => rows(db, "select status from follows"))).toEqual([{ status: "pending" }]);
  });

  it("computes user_stats with the viewer's permissions", async () => {
    const forCarol = await as(db, CAROL, () =>
      rows(db, "select total_sessions::int as n from user_stats where user_id = $1", [BOB])
    );
    expect(forCarol).toEqual([{ n: 0 }]);
    const forBob = await as(db, BOB, () => rows(db, "select total_sessions::int as n from user_stats where user_id = $1", [BOB]));
    expect(forBob).toEqual([{ n: 1 }]);
  });

  it("drops the unused sessions_with_counts view", async () => {
    expect(await rows(db, "select to_regclass('public.sessions_with_counts') as v")).toEqual([{ v: null }]);
  });
});

describe("private snippet storage (007)", () => {
  const bobPath = `${BOB}/${BOB_SESSION}/clip.wav`;
  const alicePath = `${ALICE}/${ALICE_SESSION}/clip.wav`;

  it("makes the bucket private", async () => {
    expect(await rows(db, "select public from storage.buckets where id = 'snippets'")).toEqual([{ public: false }]);
  });

  it("only allows uploads into your own user and session folder", async () => {
    const insert = (uid: string, name: string) =>
      as(db, uid, () => db.query("insert into storage.objects (bucket_id, name) values ('snippets', $1)", [name]));
    await expect(insert(ALICE, alicePath)).resolves.toBeDefined();
    await expect(insert(ALICE, bobPath)).rejects.toThrow(/row-level security/);
    await expect(insert(ALICE, `${ALICE}/${BOB_SESSION}/x.wav`)).rejects.toThrow(/row-level security/);
  });

  it("lets only people who can see the session read (sign) the audio", async () => {
    await db.query("insert into storage.objects (bucket_id, name) values ('snippets', $1)", [bobPath]);
    await db.query("insert into snippets (session_id, user_id, storage_path) values ($1, $2, $3)", [BOB_SESSION, BOB, bobPath]);
    const read = (uid: string | null) => as(db, uid, () => rows(db, "select name from storage.objects"));
    expect(await read(CAROL)).toHaveLength(0);
    expect(await read(null)).toHaveLength(0);
    expect(await read(BOB)).toHaveLength(1);
    await db.query("insert into follows (follower_id, following_id, status) values ($1, $2, 'pending')", [CAROL, BOB]);
    expect(await read(CAROL)).toHaveLength(0);
    await db.query("update follows set status = 'accepted'");
    expect(await read(CAROL)).toHaveLength(1);
  });

  it("rejects snippet rows that point elsewhere or at an external URL", async () => {
    const insert = (sql: string, params: unknown[]) => as(db, ALICE, () => db.query(sql, params));
    await expect(
      insert("insert into snippets (session_id, user_id, storage_path) values ($1, $2, $3)", [ALICE_SESSION, ALICE, alicePath])
    ).resolves.toBeDefined();
    await expect(
      insert("insert into snippets (session_id, user_id, storage_path, audio_url) values ($1, $2, $3, 'https://example.com/a.wav')", [
        ALICE_SESSION,
        ALICE,
        `${ALICE}/${ALICE_SESSION}/b.wav`,
      ])
    ).rejects.toThrow(/row-level security/);
    await expect(
      insert("insert into snippets (session_id, user_id, storage_path) values ($1, $2, $3)", [BOB_SESSION, ALICE, `${ALICE}/${BOB_SESSION}/c.wav`])
    ).rejects.toThrow(/row-level security/);
  });
});

describe("timed sessions keep their measured values (009)", () => {
  it("blocks changes to duration, breaks, start time and the manual flag", async () => {
    const update = (set: string) =>
      as(db, ALICE, () => db.query(`update sessions set ${set} where id = $1`, [ALICE_SESSION]));
    await expect(update("duration_seconds = 9999")).rejects.toThrow(/cannot be changed/);
    await expect(update("created_at = now() - interval '2 days'")).rejects.toThrow(/cannot be changed/);
    await expect(update("break_seconds = 60")).rejects.toThrow(/cannot be changed/);
    await expect(update(`break_timeline = '[{"start":1,"end":2}]'`)).rejects.toThrow(/cannot be changed/);
    await expect(update("is_manual_entry = true")).rejects.toThrow(/cannot be changed/);
    await expect(update("piece_name = 'Etude'")).resolves.toBeDefined();
  });

  it("leaves manual entries editable", async () => {
    const id = "33333333-0000-4000-8000-000000000003";
    await db.query(
      "insert into sessions (id, user_id, instrument, duration_seconds, is_manual_entry) values ($1, $2, 'Piano', 600, true)",
      [id, ALICE]
    );
    const updated = await as(db, ALICE, () =>
      rows(db, "update sessions set duration_seconds = 1200, created_at = now() - interval '1 day' where id = $1 returning duration_seconds", [id])
    );
    expect(updated).toEqual([{ duration_seconds: 1200 }]);
  });
});

describe("unique usernames on sign-up (010)", () => {
  it("adds a number when the email prefix is taken and cleans unsafe characters", async () => {
    await createUser(db, "dddddddd-0000-4000-8000-000000000001", "alice@other.com");
    await createUser(db, "dddddddd-0000-4000-8000-000000000002", "alice@third.com");
    await createUser(db, "dddddddd-0000-4000-8000-000000000003", "a.b+tag@example.com");
    await createUser(db, "dddddddd-0000-4000-8000-000000000004", "+++@example.com");
    const names = await rows<{ username: string }>(
      db,
      "select username from profiles where id::text like 'dddddddd%' order by id"
    );
    expect(names.map((r) => r.username)).toEqual(["alice1", "alice2", "a.btag", "musician"]);
  });
});

describe("search_profiles (011, 014)", () => {
  const search = (q: string) =>
    as(db, CAROL, () => rows<{ username: string }>(db, "select username from search_profiles($1)", [q]));

  it("matches username or display name, case-insensitively, exact username first", async () => {
    await db.exec("update profiles set display_name = 'Bob Alison' where username = 'bob'");
    expect((await search("ALI")).map((r) => r.username)).toEqual(["alice", "bob"]);
  });

  it("treats LIKE wildcards literally and ignores injection attempts", async () => {
    await createUser(db, "eeeeeeee-0000-4000-8000-000000000001", "x@example.com", { username: "o_b", full_name: "100% Real" });
    expect(await search("%%")).toEqual([]);
    expect(await search("__")).toEqual([]);
    expect((await search("o_b")).map((r) => r.username)).toEqual(["o_b"]);
    expect((await search("100%")).map((r) => r.username)).toEqual(["o_b"]);
    expect(await search("'); drop table profiles; --")).toEqual([]);
    expect(await rows(db, "select count(*)::int as n from profiles")).toEqual([{ n: 4 }]);
  });

  it("finds private accounts but requires at least two characters", async () => {
    expect((await search("bo")).map((r) => r.username)).toEqual(["bob"]);
    expect(await search("b")).toEqual([]);
  });
});

describe("notifications (012)", () => {
  it("are created by triggers, visible only to the recipient, and cleaned up", async () => {
    await as(db, CAROL, async () => {
      await db.query("insert into kudos (user_id, session_id) values ($1, $2)", [CAROL, ALICE_SESSION]);
      await db.query("insert into comments (user_id, session_id, content) values ($1, $2, 'bravo')", [CAROL, ALICE_SESSION]);
      await db.query("insert into follows (follower_id, following_id) values ($1, $2)", [CAROL, ALICE]);
      await db.query("insert into follows (follower_id, following_id) values ($1, $2)", [CAROL, BOB]);
    });
    // own kudos: no notification
    await as(db, ALICE, () => db.query("insert into kudos (user_id, session_id) values ($1, $2)", [ALICE, ALICE_SESSION]));

    const inbox = (uid: string) =>
      as(db, uid, () => rows<{ type: string }>(db, "select type from notifications order by created_at, type"));
    expect((await inbox(ALICE)).map((r) => r.type).sort()).toEqual(["comment", "follow", "kudos"]);
    expect(await inbox(BOB)).toEqual([{ type: "follow_request" }]);
    expect(await as(db, CAROL, () => rows(db, "select * from notifications where recipient_id = $1", [ALICE]))).toEqual([]);

    await as(db, BOB, () => db.query("update follows set status = 'accepted' where follower_id = $1", [CAROL]));
    expect(await inbox(BOB)).toEqual([{ type: "follow" }]);
    expect(await inbox(CAROL)).toEqual([{ type: "follow_accepted" }]);

    await as(db, CAROL, async () => {
      await db.query("delete from kudos where user_id = $1", [CAROL]);
      await db.query("delete from comments where user_id = $1", [CAROL]);
    });
    expect(await inbox(ALICE)).toEqual([{ type: "follow" }]);
  });

  it("can't be forged, and recipients can only change read_at", async () => {
    await expect(
      as(db, CAROL, () =>
        db.query("insert into notifications (recipient_id, actor_id, type) values ($1, $2, 'kudos')", [ALICE, BOB])
      )
    ).rejects.toThrow(/permission denied/);
    await db.query("insert into follows (follower_id, following_id) values ($1, $2)", [CAROL, ALICE]);
    await expect(as(db, ALICE, () => db.query("update notifications set read_at = now()"))).resolves.toBeDefined();
    await expect(as(db, ALICE, () => db.query("update notifications set type = 'kudos'"))).rejects.toThrow(
      /permission denied/
    );
  });
});

describe("profile updates (013, 014)", () => {
  it("allow the settings fields and reject username and is_demo", async () => {
    const update = (set: string) => as(db, ALICE, () => db.query(`update profiles set ${set} where id = $1`, [ALICE]));
    await expect(update("bio = 'hi', weekly_goal_minutes = 300")).resolves.toBeDefined();
    await expect(update("weekly_goal_minutes = 0")).rejects.toThrow(/weekly_goal_range/);
    await expect(update("is_demo = true")).rejects.toThrow(/permission denied/);
    await expect(update("username = 'someone_else'")).rejects.toThrow(/permission denied/);
  });
});
