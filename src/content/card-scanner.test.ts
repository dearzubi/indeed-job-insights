// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { outermostOnly } from "./card-scanner.ts";

function el(tag = "div"): HTMLElement {
  return document.createElement(tag);
}

describe("outermostOnly", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns an empty array for empty input", () => {
    expect(outermostOnly([])).toEqual([]);
  });

  it("returns all elements when none are nested", () => {
    const a = el();
    const b = el();
    document.body.append(a, b);
    expect(outermostOnly([a, b])).toEqual([a, b]);
  });

  it("drops an element nested inside another match", () => {
    const outer = el("li");
    const inner = el("div");
    outer.appendChild(inner);
    document.body.appendChild(outer);
    expect(outermostOnly([outer, inner])).toEqual([outer]);
  });

  it("drops inner even when inner appears first in input order", () => {
    const outer = el("li");
    const inner = el("div");
    outer.appendChild(inner);
    document.body.appendChild(outer);
    expect(outermostOnly([inner, outer])).toEqual([outer]);
  });

  it("handles three-deep nesting by keeping only the outermost", () => {
    const grand = el("li");
    const parent = el("div");
    const child = el("span");
    grand.appendChild(parent);
    parent.appendChild(child);
    document.body.appendChild(grand);
    expect(outermostOnly([grand, parent, child])).toEqual([grand]);
  });

  it("keeps siblings that share a parent but aren't nested in each other", () => {
    const wrapper = el();
    const a = el();
    const b = el();
    wrapper.append(a, b);
    document.body.appendChild(wrapper);
    expect(outermostOnly([a, b])).toEqual([a, b]);
  });
});
