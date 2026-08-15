import type { Timeframe } from "./candle.contract.js";

export type MarketSession = "asia" | "london" | "new_york" | "london_new_york_overlap";

export type ValidationInput = {
  timestamp: string;
  timeframe: Timeframe;
  now: string;
  maxAgeMs: number;
  session?: MarketSession;
  allowWeekend?: boolean;
};

export type ContextValidation = {
  valid: boolean;
  timestamp: string;
  timeframe: Timeframe;
  ageMs: number;
  session?: MarketSession;
  reasons: string[];
};

const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

const SESSION_WINDOWS: Record<MarketSession, { startHour: number; endHour: number }> = {
  asia: { startHour: 0, endHour: 9 },
  london: { startHour: 7, endHour: 16 },
  new_york: { startHour: 12, endHour: 21 },
  london_new_york_overlap: { startHour: 12, endHour: 16 },
};

function parseUtc(value: string, name: string): Date {
  if (!/(Z|[+-]00:00)$/.test(value)) throw new Error(`${name} must include an explicit UTC offset`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${name} must be a valid ISO-8601 timestamp`);
  return date;
}

function isAligned(timestampMs: number, timeframe: Timeframe): boolean {
  return timestampMs % TIMEFRAME_MS[timeframe] === 0;
}

function inSession(date: Date, session: MarketSession): boolean {
  const { startHour, endHour } = SESSION_WINDOWS[session];
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  return hour >= startHour && hour < endHour;
}

export function validateCandleContext(input: ValidationInput): ContextValidation {
  const reasons: string[] = [];
  let timestamp: Date;
  let now: Date;
  try {
    timestamp = parseUtc(input.timestamp, "timestamp");
    now = parseUtc(input.now, "now");
  } catch (error) {
    return { valid: false, timestamp: input.timestamp, timeframe: input.timeframe, ageMs: Number.NaN, session: input.session, reasons: [error instanceof Error ? error.message : "invalid timestamp"] };
  }

  const timestampMs = timestamp.getTime();
  const ageMs = now.getTime() - timestampMs;
  if (!isAligned(timestampMs, input.timeframe)) reasons.push(`timestamp is not aligned to ${input.timeframe}`);
  if (!Number.isFinite(input.maxAgeMs) || input.maxAgeMs < 0) reasons.push("maxAgeMs must be a non-negative finite number");
  if (ageMs < 0) reasons.push("timestamp is in the future");
  if (ageMs > input.maxAgeMs) reasons.push(`candle is stale by ${ageMs - input.maxAgeMs}ms`);

  const weekday = timestamp.getUTCDay();
  if (!input.allowWeekend && (weekday === 0 || weekday === 6)) reasons.push("candle falls on a weekend");
  if (input.session && !inSession(timestamp, input.session)) reasons.push(`candle is outside the ${input.session} session`);

  return {
    valid: reasons.length === 0,
    timestamp: timestamp.toISOString(),
    timeframe: input.timeframe,
    ageMs,
    session: input.session,
    reasons,
  };
}
