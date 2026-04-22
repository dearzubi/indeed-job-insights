// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { unwrapHighlights, wrapTerms } from "./highlight.ts";

function makeHost(html: string): HTMLElement {
  const d = document.createElement("div");
  d.innerHTML = html;
  document.body.appendChild(d);
  return d;
}

describe("wrapTerms", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("wraps single keyword occurrences", () => {
    const h = makeHost("We use Python daily");
    wrapTerms(h, ["python"]);
    expect(h.querySelectorAll(".ext-kw-hit").length).toBe(1);
    expect(h.querySelector(".ext-kw-hit")?.textContent).toBe("Python");
  });

  it("wraps multiple distinct keywords", () => {
    const h = makeHost("Python, React, and TypeScript");
    wrapTerms(h, ["python", "react", "typescript"]);
    expect(h.querySelectorAll(".ext-kw-hit").length).toBe(3);
  });

  it("wraps multiple occurrences of the same keyword", () => {
    const h = makeHost("python python python");
    wrapTerms(h, ["python"]);
    expect(h.querySelectorAll(".ext-kw-hit").length).toBe(3);
  });

  it("does not re-wrap text already inside ext-kw-hit", () => {
    const h = makeHost(`<span class="ext-kw-hit">Python</span> is a language`);
    wrapTerms(h, ["python"]);
    expect(h.querySelectorAll(".ext-kw-hit").length).toBe(1);
  });

  it("escapes regex special characters in keywords", () => {
    const h = makeHost("We code in C++ daily");
    wrapTerms(h, ["c++"]);
    expect(h.querySelector(".ext-kw-hit")?.textContent).toBe("C++");
  });

  it("no-ops on empty keyword list", () => {
    const h = makeHost("anything");
    wrapTerms(h, []);
    expect(h.querySelectorAll(".ext-kw-hit").length).toBe(0);
    expect(h.textContent).toBe("anything");
  });

  it("handles nested DOM by walking text nodes", () => {
    const h = makeHost("<p>Using <b>Python</b> for data</p>");
    wrapTerms(h, ["python", "data"]);
    expect(h.querySelectorAll(".ext-kw-hit").length).toBe(2);
  });
});

describe("unwrapHighlights", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("removes ext-kw-hit spans and inlines their text", () => {
    const h = makeHost(`We use <span class="ext-kw-hit">Python</span> daily`);
    unwrapHighlights(h);
    expect(h.querySelectorAll(".ext-kw-hit").length).toBe(0);
    expect(h.textContent).toBe("We use Python daily");
  });

  it("is a no-op when no highlights exist", () => {
    const h = makeHost("plain text with no spans");
    unwrapHighlights(h);
    expect(h.textContent).toBe("plain text with no spans");
  });

  it("is the inverse of wrapTerms for text content", () => {
    const h = makeHost("Python, React and TypeScript");
    const before = h.textContent;
    wrapTerms(h, ["python", "react", "typescript"]);
    unwrapHighlights(h);
    expect(h.textContent).toBe(before);
  });
});
