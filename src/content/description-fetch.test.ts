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
      expect(r.postedAge).toBeNull();
      expect(r.postedToday).toBe(false);
      expect(r.numOfCandidates).toBeNull();
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

  it("returns hiring insights when embedded JSON is present", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body>
          <div class="jobsearch-JobComponent-description">body text</div>
          <script>var foo = "hiringInsightsModel":{"age":"8 days ago","employerLastReviewed":null,"employerResponsiveCardModel":null,"numOfCandidates":"50+","postedToday":false,"recurringHireText":null,"urgentlyHiringModel":null};</script>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("abc");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.postedAge).toBe("8 days ago");
      expect(r.postedToday).toBe(false);
      expect(r.numOfCandidates).toBe("50+");
    }
  });

  it("returns nulls/false when hiring insights block missing", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body><div class="jobsearch-JobComponent-description">body text</div></body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("noinsights");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.postedAge).toBeNull();
      expect(r.postedToday).toBe(false);
      expect(r.numOfCandidates).toBeNull();
    }
  });

  it("handles postedToday: true", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body>
          <div class="jobsearch-JobComponent-description">body</div>
          <script>"hiringInsightsModel":{"age":"today","numOfCandidates":null,"postedToday":true}</script>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("xyz1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.postedToday).toBe(true);
      expect(r.numOfCandidates).toBeNull();
    }
  });
});
