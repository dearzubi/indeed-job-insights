import type { Config } from "../shared/config.ts";
import { sanitizeLocation } from "../shared/location.ts";
import type { ComputeDistanceResponse, DistanceDestination } from "../shared/messages.ts";
import { fetchJobDescription, type JobLocation } from "./description-fetch.ts";
import { inject } from "./injector.ts";
import { match } from "./matcher.ts";
import { extractJobKey, SELECTORS } from "./selectors.ts";

// Priority: postcode → lat/long → fullAddress → card text.
// Postcode is composed with countryCode so Google disambiguates codes that
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

const visited = new WeakSet<HTMLElement>();

export function observeCard(card: HTMLElement, config: Config): void {
  if (visited.has(card)) return;
  const observer = new IntersectionObserver(
    async (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.disconnect();
        visited.add(card);
        await processCard(card, config);
      }
    },
    { threshold: 0.1 },
  );
  observer.observe(card);
}

async function processCard(card: HTMLElement, config: Config): Promise<void> {
  const jobKey = extractJobKey(card);
  if (!jobKey) return;

  const structuredLocation =
    card.querySelector<HTMLElement>(SELECTORS.locationText)?.textContent?.trim() ?? "";

  const desc = await fetchJobDescription(jobKey);
  // Fall back to the card's visible snippet when the viewjob fetch fails
  // (typically Cloudflare 403 after a burst). Better to decorate with a
  // partial signal than to leave the card blank.
  const fullText = desc.ok
    ? desc.fullText
    : (card.querySelector<HTMLElement>(SELECTORS.snippetText)?.textContent?.trim() ?? "");

  const postedAge = desc.ok ? desc.postedAge : null;
  const postedToday = desc.ok ? desc.postedToday : false;
  const organicApplyStarts = desc.ok ? desc.organicApplyStarts : null;

  const result = match(fullText, structuredLocation, config);

  let distanceMinutes: number | null = null;
  let distanceError: string | null = null;

  // Driving time is an optional feature: skip the Google Maps call entirely
  // when the user hasn't provided an address or API key. The card still gets
  // all other decorations (pills, keyword highlights, dim logic).
  const canComputeDistance = config.homeCity.trim() !== "" && config.googleMapsApiKey.trim() !== "";
  const destination = canComputeDistance
    ? pickDestination(desc.ok ? desc.location : null, structuredLocation)
    : null;
  if (destination) {
    const response = (await chrome.runtime.sendMessage({
      type: "computeDistance",
      from: config.homeCity,
      to: destination,
      apiKey: config.googleMapsApiKey,
    })) as ComputeDistanceResponse;
    if (response.ok) {
      distanceMinutes = response.minutes;
    } else if (response.errorKind !== "no-route") {
      // Swallow no-route errors (generic destinations like "Remote" or just
      // "United Kingdom" that Google can't route to). Showing a red ⚠ for
      // these is noise — the user can't fix them. Real errors like bad key /
      // quota / network still surface.
      distanceError = response.message;
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
}
