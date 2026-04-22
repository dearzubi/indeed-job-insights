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
      cityPillLabel: "📍 Mississauga mentioned",
      keywordHits: [
        { term: "Python", start: 0, end: 6 },
        { term: "React", start: 11, end: 16 },
      ],
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
      cityHit: "remote",
      cityPillLabel: "🏠 Remote",
      keywordHits: [],
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
      cityPillLabel: null,
      keywordHits: [],
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
      cityPillLabel: "📍 Home city match",
      keywordHits: [],
      isZeroMatch: false,
      leftBorderColor: "purple",
    };
    inject(card, result, { distanceMinutes: 8, distanceError: null, dimZeroMatch: false });
    remove(card);
    expect(card.querySelector(".ext-pills")).toBeNull();
    expect(card.classList.contains("ext-border-purple")).toBe(false);
    expect(card.classList.contains("ext-dim")).toBe(false);
  });
});
