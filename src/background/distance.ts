import type { ComputeDistanceResponse } from "../shared/messages.ts";

interface Params {
  from: string;
  to: string;
  apiKey: string;
}

const BASE_URL = "https://maps.googleapis.com/maps/api/distancematrix/json";

export async function fetchDrivingDistance(params: Params): Promise<ComputeDistanceResponse> {
  const url = new URL(BASE_URL);
  url.searchParams.set("origins", params.from);
  url.searchParams.set("destinations", params.to);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("key", params.apiKey);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (e) {
    return { ok: false, errorKind: "network", message: String(e) };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (e) {
    return { ok: false, errorKind: "network", message: `parse: ${String(e)}` };
  }

  const top = body as {
    status?: string;
    error_message?: string;
    rows?: Array<{
      elements?: Array<{
        status?: string;
        duration?: { value: number };
        distance?: { value: number };
      }>;
    }>;
  };

  if (top.status === "REQUEST_DENIED") {
    return { ok: false, errorKind: "invalid-key", message: top.error_message ?? "request denied" };
  }
  if (top.status === "OVER_QUERY_LIMIT") {
    return { ok: false, errorKind: "quota-exceeded", message: "over quota" };
  }
  if (top.status !== "OK") {
    return { ok: false, errorKind: "unknown", message: top.status ?? "no status" };
  }

  const element = top.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK" || !element.duration || !element.distance) {
    return { ok: false, errorKind: "no-route", message: element?.status ?? "no element" };
  }

  return {
    ok: true,
    minutes: Math.round(element.duration.value / 60),
    meters: element.distance.value,
    cached: false,
  };
}
