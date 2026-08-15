import type { Timeframe } from "./candle.contract.js";
import type { HistoricalCandle } from "./historical.pipeline.js";
import type { IngestionQualityResult } from "./quality.gate.js";

export type MarketSnapshotInput = {
  planKey: string;
  provider: string;
  canonicalSymbol: string;
  timeframe: Timeframe;
  start: string;
  end: string;
  candles: readonly HistoricalCandle[];
  quality: Pick<IngestionQualityResult, "status" | "reasons">;
};

export type MarketSnapshot = Omit<MarketSnapshotInput, "candles" | "quality"> & {
  snapshotKey: string;
  candles: readonly HistoricalCandle[];
  quality: MarketSnapshotInput["quality"];
};

export type SnapshotResult =
  | { status: "READY"; snapshot: MarketSnapshot }
  | { status: "BLOCKED"; reasons: string[] };

function parseUtc(value: string, field: string): number | string {
  if (!/(Z|[+-]00:00)$/.test(value)) return `${field} must include an explicit UTC offset`;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? `${field} must be a valid ISO-8601 timestamp` : timestamp;
}

function stableCandleIdentity(candle: HistoricalCandle): string {
  return [candle.timestamp, candle.symbol, candle.timeframe, candle.open, candle.high, candle.low, candle.close, candle.volume].join(":");
}

export function createMarketSnapshot(input: MarketSnapshotInput): SnapshotResult {
  const reasons: string[] = [];
  if (!input.planKey.trim()) reasons.push("planKey is required");
  if (!input.provider.trim()) reasons.push("provider is required");
  if (!input.canonicalSymbol.trim()) reasons.push("canonicalSymbol is required");
  if (input.quality.status === "BLOCKED") reasons.push(...input.quality.reasons.map((reason) => `quality blocked: ${reason}`));
  if (input.candles.length === 0) reasons.push("snapshot contains no candles");
  const start = parseUtc(input.start, "start");
  const end = parseUtc(input.end, "end");
  if (typeof start === "string") reasons.push(start);
  if (typeof end === "string") reasons.push(end);
  if (typeof start === "number" && typeof end === "number" && start >= end) reasons.push("start must be before end");
  if (reasons.length) return { status: "BLOCKED", reasons };
  const candleKey = input.candles.map(stableCandleIdentity).join("|");
  const snapshotKey = [input.planKey, input.provider, input.canonicalSymbol, input.timeframe, input.start, input.end, candleKey].join("#");
  return { status: "READY", snapshot: { ...input, snapshotKey, candles: [...input.candles] } };
}
