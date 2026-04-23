export type DistanceDestination = { address: string } | { lat: number; lng: number };

export interface ComputeDistanceRequest {
  type: "computeDistance";
  from: string;
  to: DistanceDestination;
  apiKey: string;
}

export interface ComputeDistanceSuccess {
  ok: true;
  minutes: number;
  meters: number;
  cached: boolean;
}

export type DistanceErrorKind =
  | "no-route"
  | "invalid-key"
  | "quota-exceeded"
  | "rate-limited"
  | "network"
  | "unknown";

export interface ComputeDistanceError {
  ok: false;
  errorKind: DistanceErrorKind;
  message: string;
}

export type ComputeDistanceResponse = ComputeDistanceSuccess | ComputeDistanceError;

export type ContentToBackground = ComputeDistanceRequest;

export type BackgroundResponse = ComputeDistanceResponse;

export interface StorageLike {
  get(key: string): Promise<{ [k: string]: unknown }>;
  set(obj: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}
