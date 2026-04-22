/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { inject, remove } from "./injector.ts";
import type { MatchResult } from "./matcher.ts";

function makeCard(): HTMLElement {
  const card = document.createElement("li");
  card.setAttribute("data-testid", "jobcard");
  card.innerHTML = `
    <h2 class="jobTitle"><a>Role</a></h2>
    <span data-testid="text-location">Toronto, ON</span>
    <div data-testid="job-snippet">We love Python and React.</div>
  `;
  document.body.appendChild(card);
  return card;
}

describe("inject / remove", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("adds pill row and highlights keywords", () => {
    const card = makeCard();
    const result: MatchResult = {
      cityHit: "home-mentioned",
      workMode: "onsite",
      cityPillLabel: "📍 Mississauga mentioned",
      workModePillLabel: "🏙️ Onsite",
      keywordHits: [
        { term: "Python", start: 0, end: 6 },
        { term: "React", start: 11, end: 16 },
      ],
      excludedHitsCount: 0,
      isZeroMatch: false,
      leftBorderColor: "green",
    };
    inject(card, result, { distanceMinutes: 42, distanceError: null, dimZeroMatch: false });
    expect(card.querySelector(".ext-pills")).not.toBeNull();
    expect(card.querySelectorAll(".ext-pill").length).toBeGreaterThanOrEqual(2);
    expect(card.querySelector(".ext-distance")?.textContent).toContain("42");
    expect(card.querySelectorAll(".ext-kw-hit").length).toBe(2);
    expect(card.classList.contains("ext-border-green")).toBe(true);
  });

  it("is idempotent — re-injecting replaces existing decorations", () => {
    const card = makeCard();
    const result: MatchResult = {
      cityHit: "none",
      workMode: "remote",
      cityPillLabel: null,
      workModePillLabel: "🏠 Remote",
      keywordHits: [],
      excludedHitsCount: 0,
      isZeroMatch: false,
      leftBorderColor: "blue",
    };
    inject(card, result, { distanceMinutes: null, distanceError: null, dimZeroMatch: false });
    inject(card, result, { distanceMinutes: null, distanceError: null, dimZeroMatch: false });
    expect(card.querySelectorAll(".ext-pills").length).toBe(1);
  });

  it("adds ext-dim when zero match and toggle on", () => {
    const card = makeCard();
    const result: MatchResult = {
      cityHit: "none",
      workMode: "onsite",
      cityPillLabel: null,
      workModePillLabel: "🏙️ Onsite",
      keywordHits: [],
      excludedHitsCount: 0,
      isZeroMatch: true,
      leftBorderColor: null,
    };
    inject(card, result, { distanceMinutes: 51, distanceError: null, dimZeroMatch: true });
    expect(card.classList.contains("ext-dim")).toBe(true);
  });

  it("remove cleans all decorations and classes", () => {
    const card = makeCard();
    const result: MatchResult = {
      cityHit: "home",
      workMode: "onsite",
      cityPillLabel: "📍 Home city match",
      workModePillLabel: "🏙️ Onsite",
      keywordHits: [],
      excludedHitsCount: 0,
      isZeroMatch: false,
      leftBorderColor: "purple",
    };
    inject(card, result, { distanceMinutes: 8, distanceError: null, dimZeroMatch: false });
    remove(card);
    expect(card.querySelector(".ext-pills")).toBeNull();
    expect(card.classList.contains("ext-border-purple")).toBe(false);
    expect(card.classList.contains("ext-dim")).toBe(false);
  });

  it("always renders a work-mode pill even with no matches", () => {
    const card = makeCard();
    const result: MatchResult = {
      cityHit: "none",
      workMode: "onsite",
      cityPillLabel: null,
      workModePillLabel: "🏙️ Onsite",
      keywordHits: [],
      excludedHitsCount: 0,
      isZeroMatch: true,
      leftBorderColor: null,
    };
    inject(card, result, { distanceMinutes: null, distanceError: null, dimZeroMatch: false });
    const pills = card.querySelectorAll(".ext-pill");
    expect(pills.length).toBe(1);
    expect(pills[0]?.className).toContain("ext-pill-onsite");
    expect(pills[0]?.textContent).toBe("🏙️ Onsite");
  });

  it("renders hybrid pill for hybrid cards", () => {
    const card = makeCard();
    const result: MatchResult = {
      cityHit: "none",
      workMode: "hybrid",
      cityPillLabel: null,
      workModePillLabel: "🏢 Hybrid",
      keywordHits: [],
      excludedHitsCount: 0,
      isZeroMatch: true,
      leftBorderColor: null,
    };
    inject(card, result, { distanceMinutes: null, distanceError: null, dimZeroMatch: false });
    const pill = card.querySelector(".ext-pill-hybrid");
    expect(pill?.textContent).toBe("🏢 Hybrid");
  });

  it("formats distance < 60 minutes as 'Nm'", () => {
    const card = makeCard();
    const result: MatchResult = {
      cityHit: "none",
      workMode: "onsite",
      cityPillLabel: null,
      workModePillLabel: "🏙️ Onsite",
      keywordHits: [],
      excludedHitsCount: 0,
      isZeroMatch: true,
      leftBorderColor: null,
    };
    inject(card, result, { distanceMinutes: 42, distanceError: null, dimZeroMatch: false });
    expect(card.querySelector(".ext-distance")?.textContent).toBe("🚗 42m");
  });

  it("formats exactly 60 minutes as '1h'", () => {
    const card = makeCard();
    const result: MatchResult = {
      cityHit: "none",
      workMode: "onsite",
      cityPillLabel: null,
      workModePillLabel: "🏙️ Onsite",
      keywordHits: [],
      excludedHitsCount: 0,
      isZeroMatch: true,
      leftBorderColor: null,
    };
    inject(card, result, { distanceMinutes: 60, distanceError: null, dimZeroMatch: false });
    expect(card.querySelector(".ext-distance")?.textContent).toBe("🚗 1h");
  });

  it("formats 90 minutes as '1h 30m'", () => {
    const card = makeCard();
    const result: MatchResult = {
      cityHit: "none",
      workMode: "onsite",
      cityPillLabel: null,
      workModePillLabel: "🏙️ Onsite",
      keywordHits: [],
      excludedHitsCount: 0,
      isZeroMatch: true,
      leftBorderColor: null,
    };
    inject(card, result, { distanceMinutes: 90, distanceError: null, dimZeroMatch: false });
    expect(card.querySelector(".ext-distance")?.textContent).toBe("🚗 1h 30m");
  });

  it("renders excluded hits pill when count > 0", () => {
    const card = makeCard();
    const result: MatchResult = {
      cityHit: "none",
      workMode: "onsite",
      cityPillLabel: null,
      workModePillLabel: "🏙️ Onsite",
      keywordHits: [],
      excludedHitsCount: 3,
      isZeroMatch: true,
      leftBorderColor: null,
    };
    inject(card, result, { distanceMinutes: null, distanceError: null, dimZeroMatch: false });
    const pill = card.querySelector(".ext-pill-excluded");
    expect(pill?.textContent).toBe("⊘ 3 excluded hits");
  });

  it("excluded pill singular grammar at count 1", () => {
    const card = makeCard();
    const result: MatchResult = {
      cityHit: "none",
      workMode: "onsite",
      cityPillLabel: null,
      workModePillLabel: "🏙️ Onsite",
      keywordHits: [],
      excludedHitsCount: 1,
      isZeroMatch: true,
      leftBorderColor: null,
    };
    inject(card, result, { distanceMinutes: null, distanceError: null, dimZeroMatch: false });
    expect(card.querySelector(".ext-pill-excluded")?.textContent).toBe("⊘ 1 excluded hit");
  });

  it("no excluded pill when count is 0", () => {
    const card = makeCard();
    const result: MatchResult = {
      cityHit: "none",
      workMode: "onsite",
      cityPillLabel: null,
      workModePillLabel: "🏙️ Onsite",
      keywordHits: [],
      excludedHitsCount: 0,
      isZeroMatch: true,
      leftBorderColor: null,
    };
    inject(card, result, { distanceMinutes: null, distanceError: null, dimZeroMatch: false });
    expect(card.querySelector(".ext-pill-excluded")).toBeNull();
  });
});
