import assert from "node:assert/strict";
import test from "node:test";
import { ReplayProvider, ProviderContractError, fetchAndNormalize, validateHistoricalRequest } from "../src/quant/data/provider.contract.js";
import type { RawHistoricalRecord } from "../src/quant/data/historical.pipeline.js";

const rows: RawHistoricalRecord[] = [
  { sourceRow: 2, symbol: "XAU/USD", timeframe: "15m", timestamp: "2026-08-17T12:15:00Z", open: 2548, high: 2552, low: 2546, close: 2550, volume: 1100, provider: "source" },
  { sourceRow: 1, symbol: "XAU/USD", timeframe: "15m", timestamp: "2026-08-17T12:00:00Z", open: 2540, high: 2550, low: 2534, close: 2548, volume: 1200, provider: "source" },
];

const request = { canonicalSymbol: "XAUUSD", timeframe: "15m" as const, start: "2026-08-17T12:00:00Z", end: "2026-08-17T12:30:00Z", limit: 10 };

test("defines a provider-neutral capability and request contract", () => {
  const provider = new ReplayProvider("XAU/USD", rows);
  assert.equal(provider.capabilities.historical, true);
  assert.equal(provider.capabilities.realtime, false);
  validateHistoricalRequest(request, provider.capabilities);
});

test("replays records deterministically within the requested UTC range", async () => {
  const provider = new ReplayProvider("XAU/USD", rows);
  const first = await provider.fetchHistorical(request);
  const second = await provider.fetchHistorical(request);
  assert.deepEqual(first, second);
  assert.deepEqual(first.records.map((row) => row.timestamp), ["2026-08-17T12:00:00Z", "2026-08-17T12:15:00Z"]);
  assert.equal(first.records[0].provider, "replay");
});

test("passes replay output through DATA-004 normalization and preserves source identity", async () => {
  const result = await fetchAndNormalize(new ReplayProvider("XAU/USD", rows), request);
  assert.equal(result.rejected.length, 0);
  assert.deepEqual(result.accepted.map((row) => row.symbol), ["XAUUSD", "XAUUSD"]);
  assert.equal(result.accepted[0].source.provider, "replay");
  assert.equal(result.accepted[0].source.symbol, "XAU/USD");
});

test("rejects invalid ranges, limits, unsupported capabilities, and unsupported timeframes", () => {
  const provider = new ReplayProvider("XAU/USD", rows);
  assert.throws(() => validateHistoricalRequest({ ...request, start: request.end }, provider.capabilities), /start must be before end/);
  assert.throws(() => validateHistoricalRequest({ ...request, limit: 0 }, provider.capabilities), /limit must be a positive integer/);
  assert.throws(() => validateHistoricalRequest({ ...request, timeframe: "1h" }, { ...provider.capabilities, supportedTimeframes: ["15m"] }), /does not support timeframe 1h/);
  assert.throws(() => validateHistoricalRequest(request, { ...provider.capabilities, historical: false }), /does not support historical/);
});

test("rejects a provider response with mismatched identity", async () => {
  const provider = new ReplayProvider("XAU/USD", rows);
  const mismatched = { ...provider, fetchHistorical: async () => ({ provider: "wrong", sourceSymbol: "XAU/USD", records: rows }) };
  await assert.rejects(() => fetchAndNormalize(mismatched, request), ProviderContractError);
});
