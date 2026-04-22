import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDrivingDistance } from "../../src/background/distance.ts";

const g = globalThis as typeof globalThis & { fetch: typeof fetch };

describe("fetchDrivingDistance", () => {
  beforeEach(() => {
    g.fetch = vi.fn();
  });

  it("returns minutes and meters on OK response", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "OK",
          rows: [
            { elements: [{ status: "OK", duration: { value: 1800 }, distance: { value: 30000 } }] },
          ],
        }),
      ),
    );
    const r = await fetchDrivingDistance({ from: "Mississauga", to: "Toronto", apiKey: "k" });
    expect(r).toEqual({ ok: true, minutes: 30, meters: 30000, cached: false });
  });

  it("returns invalid-key on REQUEST_DENIED", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ status: "REQUEST_DENIED", error_message: "bad key" })),
    );
    const r = await fetchDrivingDistance({ from: "a", to: "b", apiKey: "k" });
    expect(r).toEqual({
      ok: false,
      errorKind: "invalid-key",
      message: expect.stringContaining("bad key"),
    });
  });

  it("returns quota-exceeded on OVER_QUERY_LIMIT", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ status: "OVER_QUERY_LIMIT" })),
    );
    const r = await fetchDrivingDistance({ from: "a", to: "b", apiKey: "k" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorKind).toBe("quota-exceeded");
  });

  it("returns no-route on per-element NOT_FOUND", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ status: "OK", rows: [{ elements: [{ status: "NOT_FOUND" }] }] }),
      ),
    );
    const r = await fetchDrivingDistance({ from: "a", to: "b", apiKey: "k" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorKind).toBe("no-route");
  });

  it("returns network on fetch throw", async () => {
    (g.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("offline"));
    const r = await fetchDrivingDistance({ from: "a", to: "b", apiKey: "k" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorKind).toBe("network");
  });
});
