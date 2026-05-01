import { extractJsonArray, extractJsonObject } from "../../shared/dom.ts";
import type { EmployerResponsive, HiringInsights, JobLocation } from "./types.ts";

export function parseEmployerResponsive(raw: unknown): EmployerResponsive | null {
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

export function parseHiringInsights(html: string): HiringInsights {
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

export function parseOrganicApplyStarts(html: string): number | null {
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

export function parseMustHaveSkills(html: string): string[] {
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
    return [...new Set(labels)];
  } catch {
    return [];
  }
}

function parseJobLocationJson(json: string): JobLocation {
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
}

export function parseJobLocation(html: string): JobLocation | null {
  let cursor = 0;
  while (cursor < html.length) {
    const idx = html.indexOf('"location":{', cursor);
    if (idx < 0) return null;
    const json = extractJsonObject(html, idx);
    if (json?.includes("JobLocation")) {
      try {
        return parseJobLocationJson(json);
      } catch {
        // fall through and keep scanning
      }
    }
    cursor = idx + 12;
  }
  return null;
}
