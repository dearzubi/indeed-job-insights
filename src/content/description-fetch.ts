export type DescriptionResult =
  | { ok: true; fullText: string; structuredLocation: string }
  | { ok: false; error: string };

const cache = new Map<string, DescriptionResult>();

export function clearDescriptionCache(): void {
  cache.clear();
}

export async function fetchJobDescription(jobKey: string): Promise<DescriptionResult> {
  const cached = cache.get(jobKey);
  if (cached) return cached;

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
  const locEl = doc.querySelector(
    "[data-testid='inlineHeader-companyLocation'], [data-testid='jobsearch-CompanyInfoContainer'] div",
  );

  const fullText = descEl?.textContent?.trim() ?? "";
  const structuredLocation = locEl?.textContent?.trim() ?? "";

  const result: DescriptionResult = { ok: true, fullText, structuredLocation };
  cache.set(jobKey, result);
  return result;
}
