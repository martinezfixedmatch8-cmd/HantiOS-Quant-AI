import type { Timeframe } from "./candle.contract.js";
import type { ProviderCapabilities } from "./provider.contract.js";
import type { IngestionQualityResult, ProviderHealthResult } from "./quality.gate.js";

export type ProviderRouteCandidate = {
  name: string;
  priority: number;
  capabilities: ProviderCapabilities;
  health: ProviderHealthResult;
  quality: Pick<IngestionQualityResult, "status" | "reasons">;
  supportedSymbols: readonly string[];
};

export type ProviderRouteRequest = {
  canonicalSymbol: string;
  timeframe: Timeframe;
  allowDegraded?: boolean;
};

export type ProviderRouteResult =
  | { status: "SELECTED"; provider: string; reasons: string[] }
  | { status: "NO_ELIGIBLE_PROVIDER"; provider?: undefined; reasons: string[] };

function candidateReasons(candidate: ProviderRouteCandidate, request: ProviderRouteRequest): string[] {
  const reasons: string[] = [];
  if (!candidate.capabilities.historical) reasons.push("historical unsupported");
  if (!candidate.capabilities.supportedTimeframes.includes(request.timeframe)) reasons.push(`timeframe ${request.timeframe} unsupported`);
  if (!candidate.supportedSymbols.includes(request.canonicalSymbol)) reasons.push(`symbol ${request.canonicalSymbol} unsupported`);
  if (candidate.health.status === "BLOCKED") reasons.push(`health blocked: ${candidate.health.reasons.join(", ")}`);
  if (candidate.quality.status === "BLOCKED") reasons.push(`quality blocked: ${candidate.quality.reasons.join(", ")}`);
  if (candidate.health.status === "DEGRADED" && !request.allowDegraded) reasons.push("degraded provider not allowed");
  return reasons;
}

export function selectProvider(request: ProviderRouteRequest, candidates: readonly ProviderRouteCandidate[]): ProviderRouteResult {
  const ranked = [...candidates].sort((left, right) => left.priority - right.priority || left.name.localeCompare(right.name));
  const eligible = ranked.filter((candidate) => candidateReasons(candidate, request).length === 0);
  if (eligible.length > 0) return { status: "SELECTED", provider: eligible[0].name, reasons: [] };
  const reasons = ranked.length === 0
    ? ["NO_ELIGIBLE_PROVIDER: no provider candidates registered"]
    : ranked.flatMap((candidate) => [`${candidate.name}: ${candidateReasons(candidate, request).join("; ")}`]);
  return { status: "NO_ELIGIBLE_PROVIDER", reasons };
}
