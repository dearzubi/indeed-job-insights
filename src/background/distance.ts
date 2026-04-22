import type { ComputeDistanceResponse, DistanceDestination } from "../shared/messages.ts";

interface Params {
  from: string;
  to: DistanceDestination;
  apiKey: string;
}

function buildWaypoint(dest: DistanceDestination): object {
  if ("address" in dest) return { address: dest.address };
  return { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } };
}

const ENDPOINT = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
const FIELD_MASK = "originIndex,destinationIndex,duration,distanceMeters,status";

interface RouteMatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  duration?: string;
  distanceMeters?: number;
  status?: { code?: number; message?: string };
}

function parseDurationSeconds(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(\d+)s$/.exec(value);
  if (!match?.[1]) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
}

export async function fetchDrivingDistance(params: Params): Promise<ComputeDistanceResponse> {
  const body = JSON.stringify({
    origins: [{ waypoint: { address: params.from } }],
    destinations: [{ waypoint: buildWaypoint(params.to) }],
    travelMode: "DRIVE",
  });

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": params.apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body,
    });
  } catch (e) {
    return { ok: false, errorKind: "network", message: String(e) };
  }

  if (!response.ok) {
    let errMessage = `http ${response.status}`;
    try {
      const errBody = (await response.json()) as { error?: { message?: string } };
      if (errBody?.error?.message) errMessage = errBody.error.message;
    } catch {
      // ignore parse failure on error body
    }

    if (response.status === 401 || response.status === 403) {
      return { ok: false, errorKind: "invalid-key", message: errMessage };
    }
    if (response.status === 429) {
      return { ok: false, errorKind: "rate-limited", message: errMessage };
    }
    return { ok: false, errorKind: "unknown", message: errMessage };
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (e) {
    return { ok: false, errorKind: "network", message: `parse: ${String(e)}` };
  }

  const arr = parsed as RouteMatrixElement[] | undefined;
  const element = Array.isArray(arr) ? arr[0] : undefined;
  if (!element) {
    return { ok: false, errorKind: "unknown", message: "empty response" };
  }

  const code = element.status?.code ?? 0;
  if (code !== 0) {
    return {
      ok: false,
      errorKind: "no-route",
      message: element.status?.message ?? `status code ${code}`,
    };
  }

  const seconds = parseDurationSeconds(element.duration);
  const meters = element.distanceMeters;
  if (seconds === null || typeof meters !== "number") {
    return { ok: false, errorKind: "no-route", message: "missing duration or distance" };
  }

  return {
    ok: true,
    minutes: Math.round(seconds / 60),
    meters,
    cached: false,
  };
}
