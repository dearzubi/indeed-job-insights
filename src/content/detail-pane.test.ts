// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../shared/config.ts";
import { startDetailPaneHighlighter } from "./detail-pane.ts";

describe("startDetailPaneHighlighter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("no-ops when keywords list is empty", () => {
    const host = document.createElement("div");
    host.id = "jobDescriptionText";
    host.textContent = "Python and React";
    document.body.appendChild(host);
    const teardown = startDetailPaneHighlighter({ ...DEFAULT_CONFIG, keywords: [] });
    expect(host.querySelectorAll(".ext-kw-hit").length).toBe(0);
    teardown();
  });

  it("highlights configured keywords when pane is already present", () => {
    const host = document.createElement("div");
    host.id = "jobDescriptionText";
    host.textContent = "We use Python and React daily.";
    document.body.appendChild(host);
    const teardown = startDetailPaneHighlighter({
      ...DEFAULT_CONFIG,
      keywords: ["python", "react"],
    });
    expect(host.querySelectorAll(".ext-kw-hit").length).toBe(2);
    teardown();
  });

  it("re-highlights when the pane element is replaced (user clicks another card)", async () => {
    const first = document.createElement("div");
    first.id = "jobDescriptionText";
    first.textContent = "Python role";
    document.body.appendChild(first);
    const teardown = startDetailPaneHighlighter({
      ...DEFAULT_CONFIG,
      keywords: ["python", "react"],
    });
    expect(first.querySelectorAll(".ext-kw-hit").length).toBe(1);

    // Simulate Indeed swapping the detail pane content.
    first.remove();
    const second = document.createElement("div");
    second.id = "jobDescriptionText";
    second.textContent = "React and TypeScript";
    document.body.appendChild(second);
    // Let the MutationObserver fire.
    await new Promise((r) => setTimeout(r, 0));
    expect(second.querySelectorAll(".ext-kw-hit").length).toBe(1);
    teardown();
  });

  it("teardown disconnects the observer", async () => {
    const host = document.createElement("div");
    host.id = "jobDescriptionText";
    host.textContent = "Python";
    document.body.appendChild(host);
    const teardown = startDetailPaneHighlighter({
      ...DEFAULT_CONFIG,
      keywords: ["python"],
    });
    teardown();
    // Add more content after teardown — it should NOT be highlighted.
    const added = document.createElement("div");
    added.id = "jobDescriptionText";
    added.textContent = "React";
    document.body.appendChild(added);
    await new Promise((r) => setTimeout(r, 0));
    expect(added.querySelectorAll(".ext-kw-hit").length).toBe(0);
  });
});
