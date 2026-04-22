export const LAYOUT_VERSION = 1;

export const SELECTORS = {
  resultsContainer: "#mosaic-provider-jobcards, .jobsearch-ResultsList",
  jobCard: "li[data-testid='jobcard'], div.job_seen_beacon, li.eu4oa1w0",
  jobTitleLink: "h2.jobTitle a, a.jcs-JobTitle",
  companyName: "[data-testid='company-name'], .companyName",
  locationText: "[data-testid='text-location'], .companyLocation",
  snippetText: "[data-testid='job-snippet'], .job-snippet, div.job-snippet",
  jobKeyAttr: "data-jk",
};

export function extractJobKey(card: Element): string | null {
  const link = card.querySelector<HTMLAnchorElement>(SELECTORS.jobTitleLink);
  if (!link) return null;
  const jk = link.getAttribute(SELECTORS.jobKeyAttr);
  if (jk) return jk;
  try {
    const url = new URL(link.href, location.origin);
    return url.searchParams.get("jk");
  } catch {
    return null;
  }
}
