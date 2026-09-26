import { describe, expect, it } from "vitest";
import { cursorFilter, encodeCursor, parseCursor } from "@/lib/feed/cursor";
import { demoShiftMs } from "@/lib/demo/shift";
import { pieceTotals } from "@/lib/stats/pieces";

const ID = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

describe("feed cursor", () => {
  it("round-trips Postgres timestamps with microseconds", () => {
    const ts = "2026-09-25T18:04:11.123456+00:00";
    expect(parseCursor(encodeCursor({ created_at: ts, id: ID }))).toEqual({ createdAt: ts, id: ID });
  });

  it("rejects anything that could change the PostgREST filter", () => {
    for (const bad of [
      "",
      "not a cursor",
      `2026-09-25T18:04:11Z~${ID}~extra`,
      `2026-09-25T18:04:11Z),id.gt.0~${ID}`,
      `2026-09-25T18:04:11Z~${ID},or(id.gt.0)`,
      `2026-13-45T99:99:99Z~${ID}`,
      42,
      null,
    ]) {
      expect(parseCursor(bad)).toBeNull();
    }
  });

  it("builds a keyset filter with quoted timestamps", () => {
    const cursor = parseCursor(`2026-09-25T18:04:11.5+00:00~${ID}`)!;
    expect(cursorFilter(cursor)).toBe(
      `created_at.lt."2026-09-25T18:04:11.5+00:00",and(created_at.eq."2026-09-25T18:04:11.5+00:00",id.lt.${ID})`
    );
  });
});

describe("demo date shift", () => {
  const now = new Date("2026-09-26T12:00:00Z");

  it("moves the newest session into the last 24 hours by whole days", () => {
    const shift = demoShiftMs("2026-09-20T08:00:00Z", now);
    expect(shift).toBe(6 * 86400000);
    const shifted = Date.parse("2026-09-20T08:00:00Z") + shift;
    expect(now.getTime() - shifted).toBeLessThan(86400000);
    expect(now.getTime() - shifted).toBeGreaterThanOrEqual(0);
  });

  it("never shifts into the future or on bad input", () => {
    expect(demoShiftMs("2026-09-26T11:00:00Z", now)).toBe(0);
    expect(demoShiftMs("2026-09-27T11:00:00Z", now)).toBe(0);
    expect(demoShiftMs(null, now)).toBe(0);
    expect(demoShiftMs("garbage", now)).toBe(0);
  });
});

describe("pieceTotals", () => {
  it("groups by piece ignoring case and spacing, most practiced first", () => {
    const totals = pieceTotals([
      { piece_name: "Bach  Prelude", duration_seconds: 600, created_at: "2026-09-01T10:00:00Z" },
      { piece_name: "bach prelude", duration_seconds: 900, created_at: "2026-09-03T10:00:00Z" },
      { piece_name: "Scales", duration_seconds: 1200, created_at: "2026-09-02T10:00:00Z" },
      { piece_name: null, duration_seconds: 5000, created_at: "2026-09-02T10:00:00Z" },
      { piece_name: "  ", duration_seconds: 5000, created_at: "2026-09-02T10:00:00Z" },
    ]);
    expect(totals).toEqual([
      { name: "bach prelude", seconds: 1500, sessions: 2, lastPracticedAt: "2026-09-03T10:00:00Z" },
      { name: "Scales", seconds: 1200, sessions: 1, lastPracticedAt: "2026-09-02T10:00:00Z" },
    ]);
  });
});
