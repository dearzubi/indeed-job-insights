import type { Config } from "../shared/config.ts";
import { sanitizeLocation } from "../shared/location.ts";
import type { ComputeDistanceResponse, DistanceDestination } from "../shared/types.ts";
import { inject } from "./injector.ts";
import { fetchJobDescription } from "./job-description/fetch.ts";
import type { JobLocation } from "./job-description/types.ts";
import { match } from "./matcher.ts";
import { extractJobKey, SELECTORS } from "./selectors.ts";

const visited = new WeakSet<HTMLElement>();

// Require the card to remain intersecting for this long before we fetch. Fast
// scrolls cross the viewport in well under this window, so they no longer
// queue /viewjob requests to prevent Cloudflare 403.
const DWELL_MS = 700;

// "success" = full /viewjob data decorated; the card is done and the observer
// can detach. "retry" = either the card scrolled off while queued or the fetch
// failed (Cloudflare 403, breaker skip, network error); keep the observer
// alive so the next re-view triggers a fresh attempt once the error clears.
type ProcessResult = "success" | "retry";

// Priority Order: postcode > lat/long > fullAddress > card text.
// Postcode is composed with countryCode so Google disambiguate codes that
// exist in multiple countries (e.g. "SW1A 1AA" vs "80000").
export function pickDestination(
  jobLocation: JobLocation | null,
  cardLocation: string,
): DistanceDestination | null {
  if (jobLocation) {
    if (jobLocation.postalCode) {
      const addr = jobLocation.countryCode
        ? `${jobLocation.postalCode}, ${jobLocation.countryCode}`
        : jobLocation.postalCode;
      return { address: addr };
    }
    if (jobLocation.latitude !== null && jobLocation.longitude !== null) {
      return { lat: jobLocation.latitude, lng: jobLocation.longitude };
    }
    if (jobLocation.fullAddress) {
      return { address: jobLocation.fullAddress };
    }
  }
  const cleaned = sanitizeLocation(cardLocation);
  return cleaned ? { address: cleaned } : null;
}

export function observeCard(card: HTMLElement, config: Config): void {
  if (visited.has(card)) return;
  let dwellTimer: ReturnType<typeof setTimeout> | null = null;
  let isVisible = false;
  let processing = false;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        isVisible = entry.isIntersecting;

        // While a processCard is already running, keep updating isVisible so
        // the queued fetch sees the current state, but don't start another.
        if (processing) continue;

        if (entry.isIntersecting) {
          if (dwellTimer !== null) continue;
          dwellTimer = setTimeout(async () => {
            dwellTimer = null;
            if (!isVisible) return;
            processing = true;
            let result: ProcessResult = "retry";
            try {
              result = await processCard(card, config);
            } catch (e) {
              console.warn("[indeed-job-insights] card processing failed", e);
            }
            if (result === "success") {
              visited.add(card);
              observer.disconnect();
              return;
            }
            // Partial/skipped: leave the observer alive so the next time the
            // card re-enters the viewport, a fresh dwell cycle can re-attempt.
            processing = false;
          }, DWELL_MS);
        } else if (dwellTimer !== null) {
          clearTimeout(dwellTimer);
          dwellTimer = null;
        }
      }
    },
    { threshold: 0.5 },
  );
  observer.observe(card);
}

async function processCard(card: HTMLElement, config: Config): Promise<ProcessResult> {
  const jobKey = extractJobKey(card);
  // No job key means there's nothing we can fetch for this element - no point
  // keeping the observer alive.
  if (!jobKey) return "success";

  const structuredLocation =
    card.querySelector<HTMLElement>(SELECTORS.locationText)?.textContent?.trim() ?? "";

  const desc = await fetchJobDescription(jobKey);
  if (!desc.ok) return "retry";

  const data = desc.data;

  const fullText = desc.ok
    ? data.fullText
    : (card.querySelector<HTMLElement>(SELECTORS.snippetText)?.textContent?.trim() ?? "");

  const postedAge = data.postedAge;
  const postedToday = data.postedToday;
  const organicApplyStarts = data.organicApplyStarts;

  const result = match(fullText, structuredLocation, config);

  let distanceMinutes: number | null = null;
  let distanceError: string | null = null;

  const canComputeDistance =
    config.myAddress.trim() !== "" && config.googleMapsApiKey.trim() !== "";

  const destination = canComputeDistance
    ? pickDestination(data.location, structuredLocation)
    : null;

  if (destination) {
    try {
      const response = (await chrome.runtime.sendMessage({
        type: "computeDistance",
        from: config.myAddress,
        to: destination,
        apiKey: config.googleMapsApiKey,
      })) as ComputeDistanceResponse;
      if (response.ok) {
        distanceMinutes = response.minutes;
      } else if (response.errorKind !== "no-route") {
        // Swallow no-route errors (generic destinations like "Remote" or just
        // "United Kingdom" that Google can't route to). Showing ane error is irrelevant as
        // user can't fix them. Real errors like bad key / quota / network still surface.
        distanceError = response.message;
      }
    } catch (e) {
      // MV3 service workers go dormant; sendMessage rejects during a
      // reload/update. Keep the rest of the card's decorations intact.
      distanceError = `worker unavailable: ${String(e)}`;
    }
  }

  inject(card, result, {
    distanceMinutes,
    distanceError,
    dimZeroMatch: config.dimZeroMatch,
    dimNegativeMatch: config.dimNegativeMatch,
    excludedKeywords: config.excludedKeywords,
    postedAge,
    postedToday,
    organicApplyStarts,
  });

  return "success";
}
