import { describe, expect, it } from "vitest";
import { normalizeCityName } from "./normalize.ts";

describe("normalizeCityName", () => {
  it("lowercases", () => {
    expect(normalizeCityName("TORONTO")).toBe("toronto");
  });
  it("trims whitespace", () => {
    expect(normalizeCityName("  Toronto  ")).toBe("toronto");
  });
  it("strips province suffix", () => {
    expect(normalizeCityName("Mississauga, ON")).toBe("mississauga");
  });
  it("strips country suffix", () => {
    expect(normalizeCityName("Mississauga, ON, Canada")).toBe("mississauga");
  });
  it("strips United States suffix", () => {
    expect(normalizeCityName("Seattle, WA, United States")).toBe("seattle");
  });
  it("handles state without trailing country", () => {
    expect(normalizeCityName("Austin, TX")).toBe("austin");
  });
  it("strips punctuation like apostrophes and periods", () => {
    expect(normalizeCityName("St. John's, NL")).toBe("st johns");
  });
  it("collapses multiple spaces", () => {
    expect(normalizeCityName("New   York")).toBe("new york");
  });
  it("preserves hyphenated names as-is", () => {
    expect(normalizeCityName("Rivière-du-Loup, QC")).toBe("rivière-du-loup");
  });
  it("returns empty string for empty input", () => {
    expect(normalizeCityName("")).toBe("");
  });
  it("handles UK format", () => {
    expect(normalizeCityName("London, UK")).toBe("london");
  });
  it("handles United Kingdom suffix", () => {
    expect(normalizeCityName("Manchester, United Kingdom")).toBe("manchester");
  });
  it("handles diacritics without stripping them", () => {
    expect(normalizeCityName("Montréal, QC")).toBe("montréal");
  });
});

import { buildWholeWordRegex, normalizeKeyword } from "./normalize.ts";

describe("normalizeKeyword", () => {
  it("lowercases and trims", () => {
    expect(normalizeKeyword("  Python  ")).toBe("python");
  });
  it("preserves internal punctuation", () => {
    expect(normalizeKeyword(".NET")).toBe(".net");
  });
  it("returns empty for empty input", () => {
    expect(normalizeKeyword("")).toBe("");
  });
});

describe("buildWholeWordRegex", () => {
  it("matches as whole word, case-insensitive", () => {
    const re = buildWholeWordRegex(["python", "react"]);
    expect("I use Python daily.".match(re)?.[0]).toBe("Python");
    expect("React is cool".match(re)?.[0]).toBe("React");
  });
  it("does not match substrings", () => {
    const re = buildWholeWordRegex(["react"]);
    expect("reactor".match(re)).toBeNull();
    expect("bureaucracy".match(re)).toBeNull();
  });
  it("matches across adjacent punctuation", () => {
    const re = buildWholeWordRegex(["react"]);
    expect("(React)".match(re)?.[0]).toBe("React");
    expect("React,".match(re)?.[0]).toBe("React");
  });
  it("uses lookarounds for keywords starting with non-word char", () => {
    const re = buildWholeWordRegex([".net"]);
    expect("We use .NET daily".match(re)?.[0]).toBe(".NET");
    expect("I prefer cabinet".match(re)).toBeNull();
  });
  it("returns a regex that finds no matches for empty keyword list", () => {
    const re = buildWholeWordRegex([]);
    expect("anything".match(re)).toBeNull();
  });
  it("escapes regex special characters", () => {
    const re = buildWholeWordRegex(["c++"]);
    expect("I code in C++ sometimes".match(re)?.[0]).toBe("C++");
  });
  it("empty-keyword sentinel is a global regex safe for matchAll", () => {
    const re = buildWholeWordRegex([]);
    // matchAll throws TypeError on non-global regexes; this must not throw.
    expect([..."whatever".matchAll(re)]).toEqual([]);
  });

  it("prefers the longest keyword when shorter keyword is a prefix (['c', 'c++'])", () => {
    const re = buildWholeWordRegex(["c", "c++"]);
    expect("I code in C++ daily".match(re)?.[0]).toBe("C++");
  });

  it("prefers the longest keyword regardless of input order (['c++', 'c'])", () => {
    const re = buildWholeWordRegex(["c++", "c"]);
    expect("I code in C++ daily".match(re)?.[0]).toBe("C++");
  });

  it("prefers 'react native' over 'react' when both are configured", () => {
    const re = buildWholeWordRegex(["react", "react native"]);
    expect("Role needs React Native experience".match(re)?.[0]).toBe("React Native");
  });
});
