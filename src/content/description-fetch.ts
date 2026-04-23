export interface JobLocation {
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  fullAddress: string | null;
  countryCode: string | null;
}

export interface EmployerResponsive {
  headline: string;
  description: string;
  averageResponseInDays: number | null;
  responseRate: number | null;
}

export type DescriptionResult =
  | {
      ok: true;
      fullText: string;
      postedAge: string | null;
      postedToday: boolean;
      location: JobLocation | null;
      organicApplyStarts: number | null;
      mustHaveSkills: string[];
      employerResponsive: EmployerResponsive | null;
    }
  | { ok: false; error: string };

const cache = new Map<string, DescriptionResult>();

// Serialize /viewjob fetches with a minimum interval so a burst of card-view
// events doesn't trip Indeed's Cloudflare bot protection (which returns 403 and
// poisons the session for subsequent fetches).
const MIN_INTERVAL_MS = 1000;
let nextAllowed = 0;

function waitTurn(): Promise<void> {
  const now = Date.now();
  const slotAt = Math.max(now, nextAllowed);
  nextAllowed = slotAt + MIN_INTERVAL_MS;
  const delay = slotAt - now;
  return delay > 0 ? new Promise((r) => setTimeout(r, delay)) : Promise.resolve();
}

export function clearDescriptionCache(): void {
  cache.clear();
  nextAllowed = 0;
}

// Balanced-bracket scan starting at the first `open` bracket after `afterIdx`,
// capped to prevent runaway on malformed HTML. Returns the matched substring or
// null.
function extractBalanced(
  html: string,
  afterIdx: number,
  open: "{" | "[",
  close: "}" | "]",
  maxLen: number,
): string | null {
  const start = html.indexOf(open, afterIdx);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < html.length && i < start + maxLen; i++) {
    const c = html[i];
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

function extractJsonObject(html: string, afterIdx: number, maxLen = 16_000): string | null {
  return extractBalanced(html, afterIdx, "{", "}", maxLen);
}

function extractJsonArray(html: string, afterIdx: number, maxLen = 200_000): string | null {
  return extractBalanced(html, afterIdx, "[", "]", maxLen);
}

interface HiringInsights {
  age: string | null;
  postedToday: boolean;
  employerResponsive: EmployerResponsive | null;
}

function parseEmployerResponsive(raw: unknown): EmployerResponsive | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as {
    headline?: unknown;
    description?: unknown;
    averageResponseInDays?: unknown;
    responseRate?: unknown;
  };
  const headline = typeof r.headline === "string" ? r.headline : null;
  const description = typeof r.description === "string" ? r.description : null;
  if (!headline && !description) return null;
  return {
    headline: headline ?? "",
    description: description ?? "",
    averageResponseInDays:
      typeof r.averageResponseInDays === "number" ? r.averageResponseInDays : null,
    responseRate: typeof r.responseRate === "number" ? r.responseRate : null,
  };
}

function parseHiringInsights(html: string): HiringInsights {
  const empty: HiringInsights = {
    age: null,
    postedToday: false,
    employerResponsive: null,
  };
  const keyIdx = html.indexOf('"hiringInsightsModel":');
  if (keyIdx < 0) return empty;
  const json = extractJsonObject(html, keyIdx);
  if (!json) return empty;
  try {
    const parsed = JSON.parse(json) as {
      age?: unknown;
      postedToday?: unknown;
      employerResponsiveCardModel?: unknown;
    };
    return {
      age: typeof parsed.age === "string" ? parsed.age : null,
      postedToday: parsed.postedToday === true,
      employerResponsive: parseEmployerResponsive(parsed.employerResponsiveCardModel),
    };
  } catch {
    return empty;
  }
}

function parseOrganicApplyStarts(html: string): number | null {
  const keyIdx = html.indexOf('"jobStats":');
  if (keyIdx < 0) return null;
  const json = extractJsonObject(html, keyIdx);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as { organicApplyStarts?: unknown };
    return typeof parsed.organicApplyStarts === "number" ? parsed.organicApplyStarts : null;
  } catch {
    return null;
  }
}

function parseMustHaveSkills(html: string): string[] {
  const keyIdx = html.indexOf('"attributeComparisons":');
  if (keyIdx < 0) return [];
  const json = extractJsonArray(html, keyIdx);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as Array<{
      jobRequirementStrength?: unknown;
      attribute?: { label?: unknown } | null;
    }>;
    const labels: string[] = [];
    for (const entry of parsed) {
      if (entry.jobRequirementStrength !== "MUST_HAVE_JOB_REQUIREMENT") continue;
      const label = entry.attribute?.label;
      if (typeof label === "string" && label.trim()) labels.push(label);
    }
    // Deduplicate while preserving order.
    return [...new Set(labels)];
  } catch {
    return [];
  }
}

// The /viewjob payload embeds the job's structured location as a JSON blob
// keyed `"location":{ ... "__typename":"JobLocation" ... }`. There can be other
// unrelated `"location":{` keys in the HTML, so we scan forward until we hit one
// whose object references `JobLocation`.
function parseJobLocation(html: string): JobLocation | null {
  let cursor = 0;
  while (cursor < html.length) {
    const idx = html.indexOf('"location":{', cursor);
    if (idx < 0) return null;
    const json = extractJsonObject(html, idx);
    if (!json) return null;
    if (json.includes("JobLocation")) {
      try {
        const parsed = JSON.parse(json) as {
          postalCode?: unknown;
          latitude?: unknown;
          longitude?: unknown;
          fullAddress?: unknown;
          countryCode?: unknown;
        };
        return {
          postalCode: typeof parsed.postalCode === "string" ? parsed.postalCode : null,
          latitude: typeof parsed.latitude === "number" ? parsed.latitude : null,
          longitude: typeof parsed.longitude === "number" ? parsed.longitude : null,
          fullAddress: typeof parsed.fullAddress === "string" ? parsed.fullAddress : null,
          countryCode: typeof parsed.countryCode === "string" ? parsed.countryCode : null,
        };
      } catch {
        return null;
      }
    }
    cursor = idx + 12;
  }
  return null;
}

export async function fetchJobDescription(jobKey: string): Promise<DescriptionResult> {
  const cached = cache.get(jobKey);
  if (cached) return cached;

  await waitTurn();

  // Re-check the cache after the wait - another concurrent caller may have
  // filled it while we were queued.
  const afterWait = cache.get(jobKey);
  if (afterWait) return afterWait;

  const url = `${location.origin}/viewjob?jk=${encodeURIComponent(jobKey)}&viewtype=embedded`;
  let response: Response;
  try {
    response = await fetch(url, { credentials: "include" });
  } catch (e) {
    // Don't cache transient errors - let the next viewport intersection retry
    // once throttling/Cloudflare has recovered.
    return { ok: false, error: `fetch: ${String(e)}` };
  }
  if (!response.ok) {
    return { ok: false, error: `http ${response.status}` };
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  const descEl = doc.querySelector(".jobsearch-JobComponent-description, #jobDescriptionText");
  const fullText = descEl?.textContent?.trim() ?? "";
  const insights = parseHiringInsights(html);
  const jobLocation = parseJobLocation(html);
  const organicApplyStarts = parseOrganicApplyStarts(html);
  const mustHaveSkills = parseMustHaveSkills(html);

  const result: DescriptionResult = {
    ok: true,
    fullText,
    postedAge: insights.age,
    postedToday: insights.postedToday,
    location: jobLocation,
    organicApplyStarts,
    mustHaveSkills,
    employerResponsive: insights.employerResponsive,
  };
  cache.set(jobKey, result);
  return result;
}
