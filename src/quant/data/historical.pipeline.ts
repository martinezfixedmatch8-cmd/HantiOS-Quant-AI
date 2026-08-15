import { normalizeCandle, type CanonicalCandle, type CandleInput, type Timeframe } from "./candle.contract.js";

export type RawHistoricalRecord = CandleInput & {
  sourceRow: number;
  sourceSymbol?: string;
};

export type HistoricalCandle = CanonicalCandle & {
  source: {
    provider: string;
    row: number;
    symbol: string;
  };
};

export type RejectedHistoricalRecord = {
  sourceRow: number;
  sourceSymbol: string;
  reasons: string[];
};

export type HistoricalGap = {
  from: string;
  to: string;
  missingTimestamps: string[];
};

export type HistoricalIngestResult = {
  accepted: HistoricalCandle[];
  rejected: RejectedHistoricalRecord[];
  duplicateKeys: string[];
  gaps: HistoricalGap[];
};

const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

function rejectionReasons(error: unknown): string[] {
  if (error instanceof Error && error.message.startsWith("Invalid candle:")) return error.message.replace("Invalid candle: ", "").split("; ");
  return [error instanceof Error ? error.message : "unknown normalization error"];
}

function detectGaps(accepted: HistoricalCandle[], timeframe: Timeframe): HistoricalGap[] {
  if (accepted.length < 2) return [];
  const step = TIMEFRAME_MS[timeframe];
  const gaps: HistoricalGap[] = [];
  for (let index = 1; index < accepted.length; index += 1) {
    const previous = Date.parse(accepted[index - 1].timestamp);
    const current = Date.parse(accepted[index].timestamp);
    const missingTimestamps: string[] = [];
    for (let timestamp = previous + step; timestamp < current; timestamp += step) missingTimestamps.push(new Date(timestamp).toISOString());
    if (missingTimestamps.length) gaps.push({ from: accepted[index - 1].timestamp, to: accepted[index].timestamp, missingTimestamps });
  }
  return gaps;
}

export function ingestHistorical(records: RawHistoricalRecord[], timeframe: Timeframe): HistoricalIngestResult {
  const acceptedByKey = new Map<string, HistoricalCandle>();
  const rejected: RejectedHistoricalRecord[] = [];
  const duplicateKeys: string[] = [];

  for (const record of records) {
    try {
      const candle = normalizeCandle({ ...record, timeframe });
      const sourceSymbol = record.sourceSymbol ?? record.symbol;
      if (acceptedByKey.has(candle.dedupeKey)) {
        duplicateKeys.push(candle.dedupeKey);
        continue;
      }
      acceptedByKey.set(candle.dedupeKey, {
        ...candle,
        source: { provider: candle.provider, row: record.sourceRow, symbol: sourceSymbol },
      });
    } catch (error) {
      rejected.push({ sourceRow: record.sourceRow, sourceSymbol: record.sourceSymbol ?? record.symbol, reasons: rejectionReasons(error) });
    }
  }

  const accepted = [...acceptedByKey.values()].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  return { accepted, rejected, duplicateKeys, gaps: detectGaps(accepted, timeframe) };
}
