import assert from "node:assert/strict";
import test from "node:test";
import { ingestHistorical, type RawHistoricalRecord } from "../src/quant/data/historical.pipeline.js";

const record = (overrides: Partial<RawHistoricalRecord> = {}): RawHistoricalRecord => ({
  sourceRow: 1,
  sourceSymbol: "XAU/USD",
  symbol: "XAU/USD",
  timeframe: "15m",
  timestamp: "2026-08-17T12:00:00Z",
  open: 2540,
  high: 2550,
  low: 2534,
  close: 2548,
  volume: 1200,
  provider: "provider-a",
  ...overrides,
});

test("normalizes records and preserves source metadata", () => {
  const result = ingestHistorical([record()], "15m");
  assert.equal(result.rejected.length, 0);
  assert.equal(result.accepted[0].symbol, "XAUUSD");
  assert.deepEqual(result.accepted[0].source, { provider: "provider-a", row: 1, symbol: "XAU/USD" });
});

test("sorts records chronologically regardless of input order", () => {
  const result = ingestHistorical([
    record({ sourceRow: 2, timestamp: "2026-08-17T12:30:00Z" }),
    record({ sourceRow: 1, timestamp: "2026-08-17T12:00:00Z" }),
  ], "15m");
  assert.deepEqual(result.accepted.map((item) => item.timestamp), ["2026-08-17T12:00:00.000Z", "2026-08-17T12:30:00.000Z"]);
});

test("deduplicates by canonical key and retains the first source row", () => {
  const result = ingestHistorical([
    record({ sourceRow: 4, close: 2548 }),
    record({ sourceRow: 5, close: 2549 }),
  ], "15m");
  assert.equal(result.accepted.length, 1);
  assert.equal(result.accepted[0].source.row, 4);
  assert.deepEqual(result.duplicateKeys, ["XAUUSD:15m:2026-08-17T12:00:00.000Z"]);
});

test("reports invalid records without silently dropping them", () => {
  const result = ingestHistorical([record({ sourceRow: 7, high: 2500, volume: 0 })], "15m");
  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].sourceRow, 7);
  assert.match(result.rejected[0].reasons.join(";"), /high must be at least open and close/);
  assert.match(result.rejected[0].reasons.join(";"), /volume must be positive/);
});

test("reports missing timeframe intervals between accepted candles", () => {
  const result = ingestHistorical([
    record({ sourceRow: 1, timestamp: "2026-08-17T12:00:00Z" }),
    record({ sourceRow: 2, timestamp: "2026-08-17T12:30:00Z" }),
  ], "15m");
  assert.equal(result.gaps.length, 1);
  assert.deepEqual(result.gaps[0].missingTimestamps, ["2026-08-17T12:15:00.000Z"]);
});

test("returns an empty deterministic result for an empty batch", () => {
  assert.deepEqual(ingestHistorical([], "1h"), { accepted: [], rejected: [], duplicateKeys: [], gaps: [] });
});
