// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearDescriptionCache, fetchJobDescription } from "./description-fetch.ts";

const g = globalThis as typeof globalThis & { fetch: typeof fetch };

describe("fetchJobDescription", () => {
  beforeEach(() => {
    clearDescriptionCache();
    g.fetch = vi.fn();
  });

  it("returns fullText on success", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body>
          <div class="jobsearch-JobComponent-description">
            Hiring Python devs in Mississauga.
          </div>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("abc123");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fullText).toContain("Hiring Python devs in Mississauga.");
    }
  });

  it("caches results by jobKey", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(`<div class="jobsearch-JobComponent-description">body</div>`, {
        headers: { "Content-Type": "text/html" },
      }),
    );
    await fetchJobDescription("xyz");
    await fetchJobDescription("xyz");
    expect(g.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns error on fetch failure", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("oops"));
    const r = await fetchJobDescription("zzz");
    expect(r.ok).toBe(false);
  });
});
