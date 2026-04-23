// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { $ } from "./dom.ts";

describe("$", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns the element by id", () => {
    const input = document.createElement("input");
    input.id = "name";
    document.body.appendChild(input);
    expect($<HTMLInputElement>("name")).toBe(input);
  });

  it("throws when the element is missing", () => {
    expect(() => $("ghost")).toThrow(/missing #ghost/);
  });

  it("narrows the return type via the generic parameter", () => {
    const anchor = document.createElement("a");
    anchor.id = "link";
    document.body.appendChild(anchor);
    const el = $<HTMLAnchorElement>("link");
    expect(el.tagName).toBe("A");
  });
});
