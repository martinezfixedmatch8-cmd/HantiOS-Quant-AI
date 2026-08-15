export type QualityStatus = "PASS" | "BLOCKED";
export type ProviderHealthStatus = "HEALTHY" | "DEGRADED" | "BLOCKED";

export type IngestionQualityInput = {
  totalRecords: number;
  acceptedRecords: number;
  rejectedRecords: number;
  duplicateCount: number;
  gapCount: number;
  maxRejectedRatio?: number;
  maxGapCount?: number;
};

export type IngestionQualityResult = {
  status: QualityStatus;
  totalRecords: number;
  acceptedRecords: number;
  rejectedRecords: number;
  duplicateCount: number;
  gapCount: number;
  rejectedRatio: number;
  reasons: string[];
};

export type ProviderHealthInput = {
  statusCode: number;
  latencyMs: number;
  freshnessAgeMs: number;
  responseRecords: number;
  warningLatencyMs: number;
  hardLatencyMs: number;
  warningFreshnessMs: number;
  hardFreshnessMs: number;
};

export type ProviderHealthResult = {
  status: ProviderHealthStatus;
  reasons: string[];
};

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function evaluateIngestionQuality(input: IngestionQualityInput): IngestionQualityResult {
  const maxRejectedRatio = input.maxRejectedRatio ?? 0.1;
  const maxGapCount = input.maxGapCount ?? 0;
  const reasons: string[] = [];
  const values = [input.totalRecords, input.acceptedRecords, input.rejectedRecords, input.duplicateCount, input.gapCount, maxRejectedRatio, maxGapCount];
  if (values.some((value) => !finiteNonNegative(value))) reasons.push("counts and thresholds must be finite and non-negative");
  if (!Number.isInteger(input.totalRecords) || !Number.isInteger(input.acceptedRecords) || !Number.isInteger(input.rejectedRecords) || !Number.isInteger(input.duplicateCount) || !Number.isInteger(input.gapCount)) reasons.push("record counts must be integers");
  if (maxRejectedRatio > 1) reasons.push("maxRejectedRatio must be at most 1");
  if (input.acceptedRecords + input.rejectedRecords > input.totalRecords) reasons.push("accepted plus rejected records cannot exceed total records");
  const rejectedRatio = input.totalRecords === 0 ? 1 : input.rejectedRecords / input.totalRecords;
  if (input.totalRecords === 0) reasons.push("no records were ingested");
  if (rejectedRatio > maxRejectedRatio) reasons.push(`rejected ratio ${rejectedRatio.toFixed(4)} exceeds ${maxRejectedRatio.toFixed(4)}`);
  if (input.gapCount > maxGapCount) reasons.push(`gap count ${input.gapCount} exceeds ${maxGapCount}`);
  return { status: reasons.length ? "BLOCKED" : "PASS", totalRecords: input.totalRecords, acceptedRecords: input.acceptedRecords, rejectedRecords: input.rejectedRecords, duplicateCount: input.duplicateCount, gapCount: input.gapCount, rejectedRatio, reasons };
}

export function evaluateProviderHealth(input: ProviderHealthInput): ProviderHealthResult {
  const reasons: string[] = [];
  if (!Number.isInteger(input.statusCode) || input.statusCode < 100) reasons.push("statusCode must be a valid HTTP-like status");
  if (![input.latencyMs, input.freshnessAgeMs, input.warningLatencyMs, input.hardLatencyMs, input.warningFreshnessMs, input.hardFreshnessMs].every(finiteNonNegative)) reasons.push("health values must be finite and non-negative");
  if (input.warningLatencyMs > input.hardLatencyMs) reasons.push("warning latency cannot exceed hard latency");
  if (input.warningFreshnessMs > input.hardFreshnessMs) reasons.push("warning freshness cannot exceed hard freshness");
  if (!Number.isInteger(input.responseRecords) || input.responseRecords < 0) reasons.push("responseRecords must be a non-negative integer");
  if (reasons.length) return { status: "BLOCKED", reasons };
  if (input.statusCode < 200 || input.statusCode >= 300) reasons.push(`provider returned status ${input.statusCode}`);
  if (input.responseRecords === 0) reasons.push("provider response contained no records");
  if (input.latencyMs > input.hardLatencyMs) reasons.push("provider latency exceeded hard threshold");
  if (input.freshnessAgeMs > input.hardFreshnessMs) reasons.push("provider freshness exceeded hard threshold");
  if (reasons.length) return { status: "BLOCKED", reasons };
  if (input.latencyMs > input.warningLatencyMs) reasons.push("provider latency exceeded warning threshold");
  if (input.freshnessAgeMs > input.warningFreshnessMs) reasons.push("provider freshness exceeded warning threshold");
  return { status: reasons.length ? "DEGRADED" : "HEALTHY", reasons };
}
