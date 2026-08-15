import assert from "node:assert/strict";
import test from "node:test";
import { createMarketSnapshot, type MarketSnapshotInput } from "../src/quant/data/snapshot.contract.js";
import type { HistoricalCandle } from "../src/quant/data/historical.pipeline.js";

const candle: HistoricalCandle = { symbol: "XAUUSD", timeframe: "15m", timestamp: "2026-08-17T12:00:00Z", open: 2540, high: 2550, low: 2534, close: 2548, volume: 1200, provider: "replay", dedupeKey: "XAUUSD|15m|2026-08-17T12:00:00.000Z", source: { provider: "replay", symbol: "XAU/USD", row: 1 } };
const base: MarketSnapshotInput = { planKey: "replay|XAUUSD|15m|plan", provider: "replay", canonicalSymbol: "XAUUSD", timeframe: "15m", start: "2026-08-17T12:00:00Z", end: "2026-08-17T12:15:00Z", candles: [candle], quality: { status: "PASS", reasons: [] } };

test("creates a ready snapshot with provenance and stable identity", () => {
  const result = createMarketSnapshot(base);
  assert.equal(result.status, "READY");
  if (result.status === "READY") {
    assert.equal(result.snapshot.provider, "replay");
    assert.equal(result.snapshot.candles[0].source.symbol, "XAU/USD");
    assert.match(result.snapshot.snapshotKey, /^replay\|XAUUSD/);
  }
});

test("produces the same snapshot key for identical inputs", () => {
  const first = createMarketSnapshot(base);
  const second = createMarketSnapshot({ ...base, candles: [...base.candles] });
  assert.equal(first.status, "READY");
  assert.equal(second.status, "READY");
  if (first.status === "READY" && second.status === "READY") assert.equal(first.snapshot.snapshotKey, second.snapshot.snapshotKey);
});

test("blocks quality failures and empty candle collections", () => {
  const blocked = createMarketSnapshot({ ...base, quality: { status: "BLOCKED", reasons: ["gap threshold"] } });
  assert.equal(blocked.status, "BLOCKED");
  assert.match(blocked.reasons.join(";"), /quality blocked/);
  const empty = createMarketSnapshot({ ...base, candles: [] });
  assert.equal(empty.status, "BLOCKED");
  assert.match(empty.reasons.join(";"), /no candles/);
});

test("blocks missing identity, invalid UTC, and reversed ranges", () => {
  const result = createMarketSnapshot({ ...base, planKey: "", provider: "", start: "2026-08-17T12:15:00", end: "2026-08-17T12:00:00Z" });
  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(";"), /planKey is required/);
  assert.match(result.reasons.join(";"), /provider is required/);
  assert.match(result.reasons.join(";"), /explicit UTC/);
});
