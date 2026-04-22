import type { Config } from "../shared/config.ts";
import { sanitizeLocation } from "../shared/location.ts";
import type { ComputeDistanceResponse } from "../shared/messages.ts";
import { fetchJobDescription } from "./description-fetch.ts";
import { inject } from "./injector.ts";
import { match } from "./matcher.ts";
import { extractJobKey, SELECTORS } from "./selectors.ts";

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
  if (!desc.ok) return;

  const result = match(desc.fullText, structuredLocation, config);

  let distanceMinutes: number | null = null;
  let distanceError: string | null = null;

  const cleanedTo = sanitizeLocation(structuredLocation);
  if (cleanedTo) {
    const response = (await chrome.runtime.sendMessage({
      type: "computeDistance",
      from: config.homeCity,
      to: cleanedTo,
      apiKey: config.googleMapsApiKey,
    })) as ComputeDistanceResponse;
    if (response.ok) distanceMinutes = response.minutes;
    else distanceError = response.message;
  }

  inject(card, result, {
    distanceMinutes,
    distanceError,
    dimZeroMatch: config.dimZeroMatch,
  });
}
