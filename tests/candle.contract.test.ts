import assert from "node:assert/strict";
import test from "node:test";
import { CandleValidationError, normalizeCandle } from "../src/quant/data/candle.contract.js";

const valid = {
  symbol: " xau/usd ", timeframe: "1h", timestamp: "2026-08-15T10:00:00Z",
  open: 2540, high: 2550, low: 2534, close: 2548, volume: 1200, provider: " Provider-A "
};

test("normalizes canonical fields and creates a stable dedupe key", () => {
  const candle = normalizeCandle(valid);
  assert.equal(candle.symbol, "XAUUSD");
  assert.equal(candle.timeframe, "1h");
  assert.equal(candle.timestamp, "2026-08-15T10:00:00.000Z");
  assert.equal(candle.provider, "provider-a");
  assert.equal(candle.dedupeKey, "XAUUSD:1h:2026-08-15T10:00:00.000Z");
});

test("accepts explicit zero-offset UTC timestamps", () => {
  const candle = normalizeCandle({ ...valid, timestamp: "2026-08-15T10:00:00+00:00" });
  assert.equal(candle.timestamp, "2026-08-15T10:00:00.000Z");
});

test("rejects non-UTC timestamps", () => {
  assert.throws(() => normalizeCandle({ ...valid, timestamp: "2026-08-15T10:00:00" }), CandleValidationError);
});

test("rejects invalid OHLC relationships and non-positive volume", () => {
  assert.throws(() => normalizeCandle({ ...valid, high: 2530, volume: 0 }), /high must be at least open and close/);
  assert.throws(() => normalizeCandle({ ...valid, low: 2560 }), /low must be at most open and close/);
});

test("rejects unsupported timeframes and empty symbols", () => {
  assert.throws(() => normalizeCandle({ ...valid, symbol: "  ", timeframe: "2h" }), /symbol is required; unsupported timeframe/);
});
