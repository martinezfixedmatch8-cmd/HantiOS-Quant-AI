import assert from "node:assert/strict";
import test from "node:test";
import { selectProvider, type ProviderRouteCandidate } from "../src/quant/data/provider.router.js";

const capabilities = { historical: true, realtime: false, supportedTimeframes: ["15m", "1h"] as const };
const healthy = { status: "HEALTHY" as const, reasons: [] };
const degraded = { status: "DEGRADED" as const, reasons: ["latency warning"] };
const passQuality = { status: "PASS" as const, reasons: [] };
const blockedQuality = { status: "BLOCKED" as const, reasons: ["gap threshold exceeded"] };

function candidate(overrides: Partial<ProviderRouteCandidate> = {}): ProviderRouteCandidate {
  return { name: "primary", priority: 1, capabilities, health: healthy, quality: passQuality, supportedSymbols: ["XAUUSD"], ...overrides };
}

test("selects the highest-priority eligible provider", () => {
  const result = selectProvider({ canonicalSymbol: "XAUUSD", timeframe: "15m" }, [candidate({ name: "fallback", priority: 2 }), candidate({ name: "primary", priority: 1 })]);
  assert.deepEqual(result, { status: "SELECTED", provider: "primary", reasons: [] });
});

test("falls back deterministically when the primary is blocked", () => {
  const result = selectProvider({ canonicalSymbol: "XAUUSD", timeframe: "15m" }, [candidate({ name: "primary", priority: 1, health: { status: "BLOCKED", reasons: ["503"] } }), candidate({ name: "fallback", priority: 2 })]);
  assert.deepEqual(result, { status: "SELECTED", provider: "fallback", reasons: [] });
});

test("uses name as a deterministic tie-breaker", () => {
  const result = selectProvider({ canonicalSymbol: "XAUUSD", timeframe: "15m" }, [candidate({ name: "zeta", priority: 1 }), candidate({ name: "alpha", priority: 1 })]);
  assert.equal(result.provider, "alpha");
});

test("does not use degraded providers unless explicitly allowed", () => {
  const candidates = [candidate({ name: "degraded", health: degraded })];
  assert.equal(selectProvider({ canonicalSymbol: "XAUUSD", timeframe: "15m" }, candidates).status, "NO_ELIGIBLE_PROVIDER");
  assert.deepEqual(selectProvider({ canonicalSymbol: "XAUUSD", timeframe: "15m", allowDegraded: true }, candidates), { status: "SELECTED", provider: "degraded", reasons: [] });
});

test("rejects unsupported symbols, timeframes, capabilities, and blocked quality", () => {
  const result = selectProvider({ canonicalSymbol: "EURUSD", timeframe: "4h" }, [
    candidate({ name: "symbol-limited", supportedSymbols: ["XAUUSD"] }),
    candidate({ name: "timeframe-limited", capabilities: { ...capabilities, supportedTimeframes: ["15m"] } }),
    candidate({ name: "realtime-only", capabilities: { ...capabilities, historical: false } }),
    candidate({ name: "quality-blocked", quality: blockedQuality }),
  ]);
  assert.equal(result.status, "NO_ELIGIBLE_PROVIDER");
  assert.equal(result.reasons.length, 4);
  assert.match(result.reasons.join(";"), /unsupported/);
  assert.match(result.reasons.join(";"), /quality blocked/);
});

test("returns a structured reason when no provider candidates exist", () => {
  assert.deepEqual(selectProvider({ canonicalSymbol: "XAUUSD", timeframe: "15m" }, []), { status: "NO_ELIGIBLE_PROVIDER", reasons: ["NO_ELIGIBLE_PROVIDER: no provider candidates registered"] });
});
