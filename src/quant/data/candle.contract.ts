export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export type CandleInput = {
  symbol: string;
  timeframe: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  provider: string;
};

export type CanonicalCandle = Omit<CandleInput, "symbol" | "timeframe" | "timestamp"> & {
  symbol: string;
  timeframe: Timeframe;
  timestamp: string;
  dedupeKey: string;
};

const TIMEFRAMES = new Set<Timeframe>(["1m", "5m", "15m", "1h", "4h", "1d"]);

export class CandleValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(`Invalid candle: ${reasons.join("; ")}`);
    this.name = "CandleValidationError";
  }
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/[\s/_-]/g, "");
}

function normalizeTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) throw new CandleValidationError(["timestamp must be an ISO-8601 value"]);
  if (!/(Z|[+-]00:00)$/.test(timestamp)) throw new CandleValidationError(["timestamp must include an explicit UTC offset"]);
  return parsed.toISOString();
}

export function normalizeCandle(input: CandleInput): CanonicalCandle {
  const reasons: string[] = [];
  const symbol = normalizeSymbol(input.symbol);
  if (!symbol) reasons.push("symbol is required");
  if (!TIMEFRAMES.has(input.timeframe as Timeframe)) reasons.push("unsupported timeframe");
  if (!input.provider.trim()) reasons.push("provider is required");
  for (const [name, value] of Object.entries({ open: input.open, high: input.high, low: input.low, close: input.close, volume: input.volume })) {
    if (!Number.isFinite(value)) reasons.push(`${name} must be finite`);
  }
  if (input.volume <= 0) reasons.push("volume must be positive");
  if (input.high < Math.max(input.open, input.close)) reasons.push("high must be at least open and close");
  if (input.low > Math.min(input.open, input.close)) reasons.push("low must be at most open and close");
  if (input.low > input.high) reasons.push("low must not exceed high");
  if (reasons.length) throw new CandleValidationError(reasons);

  const timestamp = normalizeTimestamp(input.timestamp);
  const timeframe = input.timeframe as Timeframe;
  const provider = input.provider.trim().toLowerCase();
  const dedupeKey = `${symbol}:${timeframe}:${timestamp}`;
  return { symbol, timeframe, timestamp, open: input.open, high: input.high, low: input.low, close: input.close, volume: input.volume, provider, dedupeKey };
}
