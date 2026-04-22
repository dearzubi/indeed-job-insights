export type DescriptionResult = { ok: true; fullText: string } | { ok: false; error: string };

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

  const result: DescriptionResult = { ok: true, fullText };
  cache.set(jobKey, result);
  return result;
}
