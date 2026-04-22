import { describe, expect, it } from "vitest";
import { match } from "../../src/content/matcher.ts";
import { DEFAULT_CONFIG } from "../../src/shared/config.ts";

const baseConfig = {
  ...DEFAULT_CONFIG,
  homeCity: "Mississauga",
  nearbyCities: ["toronto", "brampton"],
  keywords: [],
};

describe("match — location classification", () => {
  it("returns home when structuredLocation equals homeCity", () => {
    const r = match("Anything", "Mississauga, ON", baseConfig);
    expect(r.cityHit).toBe("home");
  });
  it("returns home on case/suffix difference", () => {
    const r = match("", "MISSISSAUGA, ON, CANADA", baseConfig);
    expect(r.cityHit).toBe("home");
  });
  it("returns remote when description says remote", () => {
    const r = match("Fully remote role", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("remote");
  });
  it("returns remote for 'work from home'", () => {
    const r = match("Work from home position", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("remote");
  });
  it("returns remote for 'WFH'", () => {
    const r = match("WFH welcome", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("remote");
  });
  it("returns remote for 'hybrid'", () => {
    const r = match("Hybrid role (2 days in office)", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("remote");
  });
  it("returns home-mentioned when city in body but not structured", () => {
    const r = match("We hire from Mississauga and Oakville", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("home-mentioned");
  });
  it("returns nearby when nearby city appears in body", () => {
    const r = match("We're based in Brampton", "Markham, ON", baseConfig);
    expect(r.cityHit).toBe("nearby");
  });
  it("returns none when nothing matches", () => {
    const r = match("Calgary-only position", "Calgary, AB", baseConfig);
    expect(r.cityHit).toBe("none");
  });
  it("prefers remote over home-mentioned", () => {
    const r = match("Remote. Based in Mississauga office.", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("remote");
  });
  it("whole-word only for homeCity mention", () => {
    const r = match("We are mississaugac", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("none");
  });
});

describe("match — keyword hits", () => {
  const cfg = { ...baseConfig, keywords: ["python", "react", "typescript"] };

  it("finds all keywords as whole words", () => {
    const r = match("We use Python, React and TypeScript.", "Toronto, ON", cfg);
    const terms = r.keywordHits.map((h) => h.term.toLowerCase());
    expect(terms).toEqual(expect.arrayContaining(["python", "react", "typescript"]));
    expect(r.keywordHits).toHaveLength(3);
  });
  it("reports correct offsets in original text", () => {
    const text = "We love React here.";
    const r = match(text, "Toronto, ON", { ...cfg, keywords: ["react"] });
    expect(r.keywordHits).toHaveLength(1);
    const hit = r.keywordHits[0];
    if (!hit) throw new Error("expected a hit");
    expect(text.slice(hit.start, hit.end)).toBe("React");
  });
  it("does not match substrings", () => {
    const r = match("bureaucracy is bad", "Toronto, ON", { ...cfg, keywords: ["react"] });
    expect(r.keywordHits).toEqual([]);
  });
  it("returns multiple hits for same term", () => {
    const r = match("Python Python python", "Toronto, ON", { ...cfg, keywords: ["python"] });
    expect(r.keywordHits).toHaveLength(3);
  });
  it("handles empty keyword list", () => {
    const r = match("Python and React", "Toronto, ON", { ...cfg, keywords: [] });
    expect(r.keywordHits).toEqual([]);
  });
  it("matches keywords with non-word-boundary chars (.NET)", () => {
    const r = match("We use .NET Core.", "Toronto, ON", { ...cfg, keywords: [".net"] });
    expect(r.keywordHits).toHaveLength(1);
    expect(r.keywordHits[0]?.term.toLowerCase()).toBe(".net");
  });
});
