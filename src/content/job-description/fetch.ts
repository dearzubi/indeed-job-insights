import { fetchWithRetry } from "../../shared/fetch-with-retry.ts";
import { Throttle } from "../../shared/throttle.ts";
import { jobDescriptionCache } from "./cache.ts";
import {
  parseHiringInsights,
  parseJobLocation,
  parseMustHaveSkills,
  parseOrganicApplyStarts,
} from "./parsers.ts";
import type { JobDescriptionData, JobDescriptionResponse } from "./types.ts";

const docQuerySelector = ".jobsearch-JobComponent-description, #jobDescriptionText";

// De-dup concurrent callers so N simultaneous observers for the same jobKey
// share a single network fetch
const inFlightAPICalls = new Map<string, Promise<JobDescriptionResponse>>();

const throttle = new Throttle(1, 2000);

export async function fetchJobDescription(
  jobKey: string,
  url: string,
): Promise<JobDescriptionResponse> {
  const pending = inFlightAPICalls.get(jobKey);
  if (pending) return pending;

  const cachedJD = await jobDescriptionCache.get(jobKey);

  if (cachedJD) return { ok: true, data: cachedJD.data };

  const response = await throttle.run(() =>
    fetchWithRetry(url, { credentials: "include", redirect: "follow" }),
  );

  if (response.ok) {
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const descEl = doc.querySelector(docQuerySelector);
    const fullText = descEl?.textContent?.trim() ?? "";
    const insights = parseHiringInsights(html);
    const jobLocation = parseJobLocation(html);
    const organicApplyStarts = parseOrganicApplyStarts(html);
    const mustHaveSkills = parseMustHaveSkills(html);

    const jdData: JobDescriptionData = {
      fullText,
      postedAge: insights.age,
      postedToday: insights.postedToday,
      location: jobLocation,
      organicApplyStarts,
      mustHaveSkills,
      employerResponsive: insights.employerResponsive,
    };

    //TODO: Cache should reset on Options update

    await jobDescriptionCache.set(jobKey, {
      fetchedAt: Date.now(),
      data: jdData,
    });

    return { ok: true, data: jdData };
  }

  // Hit Cloudflare bot detection.
  if (response.status === 403) {
    throttle.pauseFor(2 * 60 * 1000);
  }

  return { ok: false, error: new Error(`${response.status}: ${await response.text()}`) };
}
