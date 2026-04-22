import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../shared/config.ts";
import { match } from "./matcher.ts";

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
  it("whole-word only for homeCity mention", () => {
    const r = match("We are mississaugac", "Toronto, ON", baseConfig);
    expect(r.cityHit).toBe("none");
  });
});

describe("match — work mode", () => {
  const cfg = { ...baseConfig, keywords: [] };

  it("onsite when structured location has no prefix", () => {
    const r = match("body text", "London E1W 1BA", cfg);
    expect(r.workMode).toBe("onsite");
    expect(r.workModePillLabel).toBe("🏙️ Onsite");
  });
  it("hybrid when structured location starts with 'Hybrid'", () => {
    const r = match("body text", "Hybrid work in London", cfg);
    expect(r.workMode).toBe("hybrid");
    expect(r.workModePillLabel).toBe("🏢 Hybrid");
  });
  it("remote when structured location starts with 'Remote'", () => {
    const r = match("body text", "Remote in London", cfg);
    expect(r.workMode).toBe("remote");
    expect(r.workModePillLabel).toBe("🏠 Remote");
  });
  it("onsite even if the body mentions WFH or remote (prevents benefits-text false positives)", () => {
    const r = match(
      "We offer WFH days as a benefit. Fully remote fridays. Work from home!",
      "London",
      cfg,
    );
    expect(r.workMode).toBe("onsite");
  });
  it("onsite when the body mentions hybrid but the location is not prefixed", () => {
    const r = match("We operate in a hybrid mode some teams", "Manchester", cfg);
    expect(r.workMode).toBe("onsite");
  });
  it("remote when structured location is exactly 'Remote'", () => {
    const r = match("any body", "Remote", cfg);
    expect(r.workMode).toBe("remote");
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

describe("match — pill label and left-border color", () => {
  const cfg = { ...baseConfig, keywords: ["python"] };

  it("home → purple border, 'Home city match' pill", () => {
    const r = match("Python role", "Mississauga, ON", cfg);
    expect(r.leftBorderColor).toBe("purple");
    expect(r.cityPillLabel).toBe("📍 Home city match");
  });
  it("home-mentioned → green border, 'Mississauga mentioned' pill", () => {
    const r = match("We also hire from Mississauga", "Toronto, ON", cfg);
    expect(r.leftBorderColor).toBe("green");
    expect(r.cityPillLabel).toBe("📍 Mississauga mentioned");
  });
  it("nearby → green border, 'Brampton mentioned' pill", () => {
    const r = match("Based in Brampton", "Markham, ON", cfg);
    expect(r.leftBorderColor).toBe("green");
    expect(r.cityPillLabel).toBe("📍 Brampton mentioned");
  });
  it("none but keyword hits → green border, no city pill", () => {
    const r = match("Python role", "Markham, ON", cfg);
    expect(r.leftBorderColor).toBe("green");
    expect(r.cityPillLabel).toBeNull();
  });
  it("none and zero keywords → null border, no pill, isZeroMatch true", () => {
    const r = match("C# role", "Markham, ON", cfg);
    expect(r.leftBorderColor).toBeNull();
    expect(r.cityPillLabel).toBeNull();
    expect(r.isZeroMatch).toBe(true);
  });
  it("home city directly matches → isZeroMatch false even with no keywords", () => {
    const r = match("", "Mississauga, ON", { ...baseConfig, keywords: [] });
    expect(r.isZeroMatch).toBe(false);
  });
  it("home-mentioned works when hybrid prefix is on the structured location", () => {
    const r = match("We also hire from Mississauga area", "Hybrid work in Toronto, ON", {
      ...baseConfig,
      keywords: [],
    });
    expect(r.cityHit).toBe("home-mentioned");
    expect(r.workMode).toBe("hybrid");
  });
  it("home exact match still works when structured location has hybrid prefix", () => {
    const r = match("body", "Hybrid work in Mississauga", { ...baseConfig, keywords: [] });
    expect(r.cityHit).toBe("home");
    expect(r.workMode).toBe("hybrid");
  });
});

describe("match — border color with work mode", () => {
  it("remote work mode → blue border", () => {
    const r = match("body", "Remote in London", { ...baseConfig, keywords: [] });
    expect(r.leftBorderColor).toBe("blue");
  });
  it("hybrid work mode alone → no border color", () => {
    const r = match("body", "Hybrid work in Edinburgh", { ...baseConfig, keywords: [] });
    expect(r.leftBorderColor).toBeNull();
  });
  it("home beats hybrid work mode for border color (purple wins)", () => {
    const r = match("body", "Mississauga, ON", { ...baseConfig, keywords: [] });
    expect(r.leftBorderColor).toBe("purple");
  });
  it("remote beats home for border color (blue wins)", () => {
    const r = match("body", "Remote in Mississauga, ON", { ...baseConfig, keywords: [] });
    expect(r.leftBorderColor).toBe("blue");
  });
  it("remote card is not zero-match even with no city or keyword hits", () => {
    const r = match("body", "Remote in Somewhere", { ...baseConfig, keywords: [] });
    expect(r.isZeroMatch).toBe(false);
  });
  it("hybrid card with no city or keyword hits is zero-match", () => {
    const r = match("body", "Hybrid work in Somewhere", { ...baseConfig, keywords: [] });
    expect(r.isZeroMatch).toBe(true);
  });
  it("with keywords configured: zero keyword hits is zero-match even when home-mentioned", () => {
    const r = match(
      "Delivery driver role. Routes around Mississauga city centre.",
      "Oakville, ON",
      { ...baseConfig, keywords: ["python", "react"] },
    );
    expect(r.cityHit).toBe("home-mentioned");
    expect(r.keywordHits).toEqual([]);
    expect(r.isZeroMatch).toBe(true);
  });
  it("with keywords configured: at least one keyword hit means NOT zero-match", () => {
    const r = match("Junior Python developer at a startup", "Leeds", {
      ...baseConfig,
      keywords: ["python"],
    });
    expect(r.keywordHits.length).toBeGreaterThan(0);
    expect(r.isZeroMatch).toBe(false);
  });
  it("with keywords configured: remote posting with zero hits is still zero-match", () => {
    const r = match("Customer support remote role", "Remote in London", {
      ...baseConfig,
      keywords: ["python", "react"],
    });
    expect(r.workMode).toBe("remote");
    expect(r.keywordHits).toEqual([]);
    expect(r.isZeroMatch).toBe(true);
  });
});

describe("match — excluded keywords", () => {
  const cfg = { ...baseConfig, keywords: ["python"], excludedKeywords: ["php", "on-site only"] };

  it("counts excluded keyword occurrences in fullText", () => {
    const r = match("Must know PHP. On-site only. Some PHP experience preferred.", "London", cfg);
    expect(r.excludedHitsCount).toBe(3);
  });
  it("returns 0 when no excluded keywords match", () => {
    const r = match("Python role with clean stack", "London", cfg);
    expect(r.excludedHitsCount).toBe(0);
  });
  it("returns 0 when excludedKeywords list is empty", () => {
    const r = match("php php php", "London", { ...cfg, excludedKeywords: [] });
    expect(r.excludedHitsCount).toBe(0);
  });
  it("excluded hits do NOT make a card zero-match", () => {
    const r = match("PHP role requiring PHP experience", "Markham, ON", {
      ...cfg,
      keywords: ["python"],
    });
    expect(r.excludedHitsCount).toBe(2);
    expect(r.keywordHits).toEqual([]);
    expect(r.isZeroMatch).toBe(true); // because keywords configured AND 0 positive hits
  });
  it("excluded hits do NOT rescue a card from zero-match", () => {
    // A card with excluded hits and no positive hits is still zero-match
    const r = match("WordPress PHP developer role", "Markham, ON", {
      ...cfg,
      keywords: ["python"],
    });
    expect(r.excludedHitsCount).toBe(1);
    expect(r.isZeroMatch).toBe(true);
  });
  it("a positive keyword hit un-dims the card regardless of excluded hits", () => {
    const r = match("Python role that also needs some PHP", "Markham, ON", cfg);
    expect(r.keywordHits.length).toBeGreaterThan(0);
    expect(r.excludedHitsCount).toBeGreaterThan(0);
    expect(r.isZeroMatch).toBe(false);
  });
});
