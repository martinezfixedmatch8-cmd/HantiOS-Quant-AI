import assert from "node:assert/strict";
import test from "node:test";
import { evaluateIngestionQuality, evaluateProviderHealth } from "../src/quant/data/quality.gate.js";

test("passes a clean ingestion batch at the rejection and gap boundaries", () => {
  const result = evaluateIngestionQuality({ totalRecords: 100, acceptedRecords: 90, rejectedRecords: 10, duplicateCount: 2, gapCount: 0, maxRejectedRatio: 0.1, maxGapCount: 0 });
  assert.equal(result.status, "PASS");
  assert.equal(result.rejectedRatio, 0.1);
  assert.deepEqual(result.reasons, []);
});

test("blocks an empty batch, high rejection ratio, and excessive gaps", () => {
  const empty = evaluateIngestionQuality({ totalRecords: 0, acceptedRecords: 0, rejectedRecords: 0, duplicateCount: 0, gapCount: 0 });
  assert.equal(empty.status, "BLOCKED");
  assert.match(empty.reasons.join(";"), /no records/);
  const poor = evaluateIngestionQuality({ totalRecords: 10, acceptedRecords: 7, rejectedRecords: 3, duplicateCount: 1, gapCount: 2, maxRejectedRatio: 0.2, maxGapCount: 1 });
  assert.equal(poor.status, "BLOCKED");
  assert.equal(poor.reasons.length, 2);
});

test("blocks invalid ingestion counters instead of guessing", () => {
  const result = evaluateIngestionQuality({ totalRecords: 10, acceptedRecords: 11, rejectedRecords: 0, duplicateCount: -1, gapCount: 0 });
  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(";"), /finite and non-negative/);
  assert.match(result.reasons.join(";"), /cannot exceed/);
});

test("classifies a healthy provider response", () => {
  const result = evaluateProviderHealth({ statusCode: 200, latencyMs: 200, freshnessAgeMs: 1000, responseRecords: 50, warningLatencyMs: 500, hardLatencyMs: 1000, warningFreshnessMs: 5000, hardFreshnessMs: 10000 });
  assert.equal(result.status, "HEALTHY");
  assert.deepEqual(result.reasons, []);
});

test("classifies warning-threshold breaches as degraded", () => {
  const result = evaluateProviderHealth({ statusCode: 200, latencyMs: 600, freshnessAgeMs: 6000, responseRecords: 50, warningLatencyMs: 500, hardLatencyMs: 1000, warningFreshnessMs: 5000, hardFreshnessMs: 10000 });
  assert.equal(result.status, "DEGRADED");
  assert.equal(result.reasons.length, 2);
});

test("blocks failed, empty, hard-latency, and hard-freshness responses", () => {
  const failed = evaluateProviderHealth({ statusCode: 503, latencyMs: 100, freshnessAgeMs: 100, responseRecords: 0, warningLatencyMs: 500, hardLatencyMs: 1000, warningFreshnessMs: 5000, hardFreshnessMs: 10000 });
  assert.equal(failed.status, "BLOCKED");
  assert.equal(failed.reasons.length, 2);
  const stale = evaluateProviderHealth({ statusCode: 200, latencyMs: 1100, freshnessAgeMs: 11000, responseRecords: 10, warningLatencyMs: 500, hardLatencyMs: 1000, warningFreshnessMs: 5000, hardFreshnessMs: 10000 });
  assert.equal(stale.status, "BLOCKED");
  assert.equal(stale.reasons.length, 2);
});
