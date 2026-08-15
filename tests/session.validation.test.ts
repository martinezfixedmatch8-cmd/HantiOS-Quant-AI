import assert from "node:assert/strict";
import test from "node:test";
import { validateCandleContext } from "../src/quant/data/session.validation.js";

const base = {
  timestamp: "2026-08-17T12:00:00Z",
  timeframe: "15m" as const,
  now: "2026-08-17T12:10:00Z",
  maxAgeMs: 15 * 60_000,
};

test("accepts an aligned, fresh weekday candle", () => {
  const result = validateCandleContext({ ...base, session: "london_new_york_overlap" });
  assert.equal(result.valid, true);
  assert.deepEqual(result.reasons, []);
  assert.equal(result.ageMs, 10 * 60_000);
});

test("rejects a timestamp that is not aligned to its timeframe", () => {
  const result = validateCandleContext({ ...base, timestamp: "2026-08-17T12:07:00Z" });
  assert.equal(result.valid, false);
  assert.match(result.reasons[0], /not aligned to 15m/);
});

test("rejects stale data at the freshness boundary after the maximum age", () => {
  const result = validateCandleContext({ ...base, now: "2026-08-17T12:16:00Z" });
  assert.equal(result.valid, false);
  assert.match(result.reasons[0], /stale/);
});

test("accepts data exactly at the configured maximum age", () => {
  const result = validateCandleContext({ ...base, now: "2026-08-17T12:15:00Z" });
  assert.equal(result.valid, true);
});

test("rejects future timestamps and non-UTC timestamps", () => {
  const future = validateCandleContext({ ...base, timestamp: "2026-08-17T12:30:00Z" });
  assert.equal(future.valid, false);
  assert.match(future.reasons[0], /future/);
  const local = validateCandleContext({ ...base, timestamp: "2026-08-17T12:00:00" });
  assert.equal(local.valid, false);
  assert.match(local.reasons[0], /explicit UTC offset/);
});

test("rejects weekend candles unless explicitly allowed", () => {
  const weekend = validateCandleContext({ ...base, timestamp: "2026-08-16T12:00:00Z", now: "2026-08-16T12:05:00Z" });
  assert.equal(weekend.valid, false);
  assert.match(weekend.reasons[0], /weekend/);
  const allowed = validateCandleContext({ ...base, timestamp: "2026-08-16T12:00:00Z", now: "2026-08-16T12:05:00Z", allowWeekend: true });
  assert.equal(allowed.valid, true);
});

test("rejects candles outside the requested market session", () => {
  const result = validateCandleContext({ ...base, timestamp: "2026-08-17T03:00:00Z", now: "2026-08-17T03:05:00Z", session: "london_new_york_overlap" });
  assert.equal(result.valid, false);
  assert.match(result.reasons[0], /outside the london_new_york_overlap session/);
});
