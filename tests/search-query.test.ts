import { describe, expect, it } from "vitest";
import { normalizeSearchQuery, SEARCH_MAX_LENGTH } from "@/lib/search/query";

describe("normalizeSearchQuery", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeSearchQuery("  ada   quaver ")).toBe("ada quaver");
  });

  it("strips a leading @ so usernames can be pasted", () => {
    expect(normalizeSearchQuery("@ada")).toBe("ada");
    expect(normalizeSearchQuery("@@ada")).toBe("ada");
  });

  it("requires at least two characters", () => {
    expect(normalizeSearchQuery("a")).toBeNull();
    expect(normalizeSearchQuery("@a")).toBeNull();
    expect(normalizeSearchQuery("   ")).toBeNull();
    expect(normalizeSearchQuery("")).toBeNull();
  });

  it("rejects non-strings (form data and URL params can be anything)", () => {
    expect(normalizeSearchQuery(undefined)).toBeNull();
    expect(normalizeSearchQuery(["ada"])).toBeNull();
    expect(normalizeSearchQuery({ toString: () => "ada" })).toBeNull();
  });

  it("caps the length", () => {
    const long = "x".repeat(200);
    expect(normalizeSearchQuery(long)).toHaveLength(SEARCH_MAX_LENGTH);
  });

  it("replaces control characters and normalizes Unicode", () => {
    expect(normalizeSearchQuery("ada\u0000\nquaver")).toBe("ada quaver");
    expect(normalizeSearchQuery("ｆｕｌｌ")).toBe("full"); // full-width letters (NFKC)
  });

  it("leaves PostgREST and LIKE syntax alone; it is sent as a bound parameter", () => {
    expect(normalizeSearchQuery("a,b.c(d)")).toBe("a,b.c(d)");
    expect(normalizeSearchQuery("100%_real")).toBe("100%_real");
  });
});
