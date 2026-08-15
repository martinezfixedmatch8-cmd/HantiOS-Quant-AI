import assert from "node:assert/strict";
import test from "node:test";
import { createFetchPlan, type MarketDataRequest } from "../src/quant/data/request.orchestrator.js";
import type { ProviderRouteCandidate } from "../src/quant/data/provider.router.js";

const capabilities = { historical: true, realtime: false, supportedTimeframes: ["15m"] as const };
const healthy = { status: "HEALTHY" as const, reasons: [] };
const quality = { status: "PASS" as const, reasons: [] };
const baseRequest: MarketDataRequest = { canonicalSymbol: "XAUUSD", timeframe: "15m", start: "2026-08-17T12:00:00Z", end: "2026-08-17T12:30:00Z", limit: 100, maxFreshnessAgeMs: 300000 };
function candidate(name: string, priority: number, overrides: Partial<ProviderRouteCandidate> = {}): ProviderRouteCandidate { return { name, priority, capabilities, health: healthy, quality, supportedSymbols: ["XAUUSD"], ...overrides }; }

test("creates a deterministic ready plan with the selected provider", () => {
  const result = createFetchPlan(baseRequest, [candidate("primary", 1), candidate("fallback", 2)]);
  assert.equal(result.status, "READY");
  if (result.status === "READY") {
    assert.equal(result.provider, "primary");
    assert.match(result.planKey, /^primary\|XAUUSD\|15m\|/);
    assert.deepEqual(result.request, baseRequest);
  }
});

test("uses the router fallback and carries the freshness policy", () => {
  const result = createFetchPlan({ ...baseRequest, maxFreshnessAgeMs: 60000 }, [candidate("primary", 1, { health: { status: "BLOCKED", reasons: ["503"] } }), candidate("fallback", 2)]);
  assert.equal(result.status, "READY");
  if (result.status === "READY") { assert.equal(result.provider, "fallback"); assert.equal(result.request.maxFreshnessAgeMs, 60000); }
});

test("blocks invalid UTC ranges and request boundaries before routing", () => {
  const cases = [
    { ...baseRequest, start: "2026-08-17T12:00:00" },
    { ...baseRequest, start: baseRequest.end },
    { ...baseRequest, limit: 0 },
    { ...baseRequest, maxFreshnessAgeMs: -1 },
    { ...baseRequest, canonicalSymbol: " " },
  ];
  for (const request of cases) { const result = createFetchPlan(request, []); assert.equal(result.status, "BLOCKED"); }
});

test("returns structured routing reasons and no partial plan when every provider is blocked", () => {
  const result = createFetchPlan(baseRequest, [candidate("primary", 1, { quality: { status: "BLOCKED", reasons: ["gap"] } })]);
  assert.deepEqual(result, { status: "BLOCKED", reasons: ["primary: quality blocked: gap"] });
});

test("does not allow degraded provider routing unless explicitly requested", () => {
  const degraded = candidate("degraded", 1, { health: { status: "DEGRADED", reasons: ["latency"] } });
  assert.equal(createFetchPlan(baseRequest, [degraded]).status, "BLOCKED");
  const allowed = createFetchPlan({ ...baseRequest, allowDegraded: true }, [degraded]);
  assert.equal(allowed.status, "READY");
});

test("produces the same plan key for the same inputs", () => {
  const first = createFetchPlan(baseRequest, [candidate("primary", 1)]);
  const second = createFetchPlan(baseRequest, [candidate("primary", 1)]);
  assert.equal(first.status, "READY");
  assert.equal(second.status, "READY");
  if (first.status === "READY" && second.status === "READY") assert.equal(first.planKey, second.planKey);
});
