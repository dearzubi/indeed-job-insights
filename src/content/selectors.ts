export const LAYOUT_VERSION = 1;

export const SELECTORS = {
  // Search results (/jobs) use `#mosaic-provider-jobcards` or `.jobsearch-ResultsList`.
  // Indeed homepage embeds a feed in `#mosaic-provider-jobcards-1` (numeric suffix)
  // wrapped by `[data-testid='new-job-feed-wrapper']`. The starts-with match covers
  // both suffixed and unsuffixed container IDs.
  resultsContainer:
    "[id^='mosaic-provider-jobcards'], .jobsearch-ResultsList, [data-testid='new-job-feed-wrapper']",
  jobCard: "li[data-testid='jobcard'], div.job_seen_beacon, li.eu4oa1w0",
  jobTitleLink: "h2.jobTitle a, a.jcs-JobTitle",
  companyName: "[data-testid='company-name'], .companyName",
  locationText: "[data-testid='text-location'], .companyLocation",
  snippetText: "[data-testid='job-snippet'], .job-snippet, div.job-snippet",
  jobKeyAttr: "data-jk",
  // Indeed's 2-pane layout marks the currently-viewed card with `.vjs-highlight`
  // on its `.cardOutline` wrapper. On the homepage the URL has no `?vjk=`, so
  // this is the only DOM signal for "active job".
  activeCardOutline: ".cardOutline.vjs-highlight",
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
