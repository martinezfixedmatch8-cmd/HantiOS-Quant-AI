import type { Timeframe } from "./candle.contract.js";
import { selectProvider, type ProviderRouteCandidate } from "./provider.router.js";

export type MarketDataRequest = {
  canonicalSymbol: string;
  timeframe: Timeframe;
  start: string;
  end: string;
  limit: number;
  allowDegraded?: boolean;
  maxFreshnessAgeMs: number;
};

export type FetchPlan = {
  status: "READY";
  provider: string;
  request: MarketDataRequest;
  planKey: string;
};

export type FetchPlanResult =
  | FetchPlan
  | { status: "BLOCKED"; reasons: string[] };

function parseUtc(value: string, field: string): number | string {
  if (!/(Z|[+-]00:00)$/.test(value)) return `${field} must include an explicit UTC offset`;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? `${field} must be a valid ISO-8601 timestamp` : parsed;
}

function validateRequest(request: MarketDataRequest): string[] {
  const reasons: string[] = [];
  const start = parseUtc(request.start, "start");
  const end = parseUtc(request.end, "end");
  if (typeof start === "string") reasons.push(start);
  if (typeof end === "string") reasons.push(end);
  if (typeof start === "number" && typeof end === "number" && start >= end) reasons.push("start must be before end");
  if (!request.canonicalSymbol.trim()) reasons.push("canonicalSymbol is required");
  if (!Number.isInteger(request.limit) || request.limit <= 0) reasons.push("limit must be a positive integer");
  if (!Number.isFinite(request.maxFreshnessAgeMs) || request.maxFreshnessAgeMs < 0) reasons.push("maxFreshnessAgeMs must be finite and non-negative");
  return reasons;
}

export function createFetchPlan(request: MarketDataRequest, candidates: readonly ProviderRouteCandidate[]): FetchPlanResult {
  const validationReasons = validateRequest(request);
  if (validationReasons.length) return { status: "BLOCKED", reasons: validationReasons };
  const route = selectProvider({ canonicalSymbol: request.canonicalSymbol, timeframe: request.timeframe, allowDegraded: request.allowDegraded }, candidates);
  if (route.status === "NO_ELIGIBLE_PROVIDER") return { status: "BLOCKED", reasons: route.reasons };
  const planKey = [route.provider, request.canonicalSymbol, request.timeframe, request.start, request.end, request.limit, request.maxFreshnessAgeMs, request.allowDegraded ? "degraded" : "healthy"].join("|");
  return { status: "READY", provider: route.provider, request: { ...request }, planKey };
}
