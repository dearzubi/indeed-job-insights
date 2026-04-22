export interface JobLocation {
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  fullAddress: string | null;
  countryCode: string | null;
}

export type DescriptionResult =
  | {
      ok: true;
      fullText: string;
      postedAge: string | null;
      postedToday: boolean;
      numOfCandidates: string | null;
      location: JobLocation | null;
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

// Balanced-brace scan starting at the first `{` after `afterIdx`, capped to
// prevent runaway on malformed HTML. Returns the JSON object string or null.
function extractJsonObject(html: string, afterIdx: number, maxLen = 16_000): string | null {
  const start = html.indexOf("{", afterIdx);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < html.length && i < start + maxLen; i++) {
    const c = html[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

interface HiringInsights {
  age: string | null;
  postedToday: boolean;
  numOfCandidates: string | null;
}

function parseHiringInsights(html: string): HiringInsights {
  const empty: HiringInsights = { age: null, postedToday: false, numOfCandidates: null };
  const keyIdx = html.indexOf('"hiringInsightsModel":');
  if (keyIdx < 0) return empty;
  const json = extractJsonObject(html, keyIdx);
  if (!json) return empty;
  try {
    const parsed = JSON.parse(json) as {
      age?: unknown;
      postedToday?: unknown;
      numOfCandidates?: unknown;
    };
    return {
      age: typeof parsed.age === "string" ? parsed.age : null,
      postedToday: parsed.postedToday === true,
      numOfCandidates: typeof parsed.numOfCandidates === "string" ? parsed.numOfCandidates : null,
    };
  } catch {
    return empty;
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

  // Re-check the cache after the wait — another concurrent caller may have
  // filled it while we were queued.
  const afterWait = cache.get(jobKey);
  if (afterWait) return afterWait;

  const url = `${location.origin}/viewjob?jk=${encodeURIComponent(jobKey)}&viewtype=embedded`;
  let response: Response;
  try {
    response = await fetch(url, { credentials: "include" });
  } catch (e) {
    const result: DescriptionResult = { ok: false, error: `fetch: ${String(e)}` };
    cache.set(jobKey, result);
    return result;
  }
  if (!response.ok) {
    const result: DescriptionResult = { ok: false, error: `http ${response.status}` };
    cache.set(jobKey, result);
    return result;
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  const descEl = doc.querySelector(".jobsearch-JobComponent-description, #jobDescriptionText");
  const fullText = descEl?.textContent?.trim() ?? "";
  const insights = parseHiringInsights(html);
  const jobLocation = parseJobLocation(html);

  const result: DescriptionResult = {
    ok: true,
    fullText,
    postedAge: insights.age,
    postedToday: insights.postedToday,
    numOfCandidates: insights.numOfCandidates,
    location: jobLocation,
  };
  cache.set(jobKey, result);
  return result;
}
