import { describe, expect, it } from "vitest";
import { normalizeCityName } from "../../src/shared/normalize.ts";

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
