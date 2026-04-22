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

  it("parses JobLocation JSON from the viewjob HTML", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body>
          <div class="jobsearch-JobComponent-description">body</div>
          <script>var x = {"location":{"__typename":"JobLocation","countryCode":"GB","admin1Code":"ENG","admin2Code":"SE","city":"Woking","postalCode":"GU21 6XB","latitude":51.31903,"longitude":-0.55893,"streetAddress":"1 High St","fullAddress":"1 High St, Woking GU21 6XB","formatted":{"__typename":"FormattedJobLocation","long":"Woking GU21 6XB","short":"Woking"}}};</script>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("loc1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.location).toEqual({
        postalCode: "GU21 6XB",
        latitude: 51.31903,
        longitude: -0.55893,
        fullAddress: "1 High St, Woking GU21 6XB",
        countryCode: "GB",
      });
    }
  });

  it("returns null fields when JobLocation has null postalCode/streetAddress", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body>
          <div class="jobsearch-JobComponent-description">body</div>
          <script>{"location":{"__typename":"JobLocation","countryCode":"GB","city":"Woking","postalCode":null,"latitude":51.31903,"longitude":-0.55893,"streetAddress":null,"fullAddress":"Woking"}}</script>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("loc2");
    expect(r.ok).toBe(true);
    if (r.ok && r.location) {
      expect(r.location.postalCode).toBeNull();
      expect(r.location.latitude).toBe(51.31903);
      expect(r.location.fullAddress).toBe("Woking");
    }
  });

  it("returns null location when no JobLocation block present", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body><div class="jobsearch-JobComponent-description">body</div></body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("loc3");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.location).toBeNull();
  });

  it("parses organicApplyStarts from jobStats", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body>
          <div class="jobsearch-JobComponent-description">body</div>
          <script>"jobStats":{"__typename":"JobStats","organicApplyStarts":134}</script>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("apply1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.organicApplyStarts).toBe(134);
  });

  it("returns null organicApplyStarts when jobStats missing", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(`<div class="jobsearch-JobComponent-description">b</div>`, {
        headers: { "Content-Type": "text/html" },
      }),
    );
    const r = await fetchJobDescription("apply2");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.organicApplyStarts).toBeNull();
  });

  it("parses must-have skill labels from attributeComparisons", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body>
          <div class="jobsearch-JobComponent-description">body</div>
          <script>"attributeComparisons":[
            {"jobRequirementStrength":"NONE","attribute":{"label":"REST"}},
            {"jobRequirementStrength":"MUST_HAVE_JOB_REQUIREMENT","attribute":{"label":"Node.js"}},
            {"jobRequirementStrength":"MUST_HAVE_JOB_REQUIREMENT","attribute":{"label":"Angular"}},
            {"jobRequirementStrength":"MUST_HAVE_JOB_REQUIREMENT","attribute":{"label":"Angular"}}
          ]</script>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("skills1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mustHaveSkills).toEqual(["Node.js", "Angular"]);
  });

  it("returns empty must-haves when no attributeComparisons match", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body>
          <div class="jobsearch-JobComponent-description">body</div>
          <script>"attributeComparisons":[{"jobRequirementStrength":"NONE","attribute":{"label":"REST"}}]</script>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("skills2");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mustHaveSkills).toEqual([]);
  });

  it("parses employerResponsiveCardModel as EmployerResponsive", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body>
          <div class="jobsearch-JobComponent-description">body</div>
          <script>"hiringInsightsModel":{"age":"9 days ago","postedToday":false,"numOfCandidates":"1","employerResponsiveCardModel":{"averageResponseInDays":3,"description":"Responded to 75% or more applications in the past 30 days, typically within 3 days.","headline":"Responsive employer","responseRate":0.85}}</script>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("er1");
    expect(r.ok).toBe(true);
    if (r.ok && r.employerResponsive) {
      expect(r.employerResponsive.headline).toBe("Responsive employer");
      expect(r.employerResponsive.averageResponseInDays).toBe(3);
      expect(r.employerResponsive.responseRate).toBe(0.85);
      expect(r.employerResponsive.description).toContain("3 days");
    }
  });

  it("returns null employerResponsive when card model is missing", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body>
          <div class="jobsearch-JobComponent-description">body</div>
          <script>"hiringInsightsModel":{"age":"2 days ago","postedToday":false,"numOfCandidates":"1","employerResponsiveCardModel":null}</script>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("er2");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.employerResponsive).toBeNull();
  });

  it("skips unrelated 'location' keys and finds the JobLocation block", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        `<html><body>
          <div class="jobsearch-JobComponent-description">body</div>
          <script>var a = {"location":{"href":"http://x"}}; var b = {"location":{"__typename":"JobLocation","countryCode":"US","postalCode":"94103","latitude":37.77,"longitude":-122.41,"fullAddress":"SF"}};</script>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const r = await fetchJobDescription("loc4");
    expect(r.ok).toBe(true);
    if (r.ok && r.location) {
      expect(r.location.postalCode).toBe("94103");
      expect(r.location.countryCode).toBe("US");
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
