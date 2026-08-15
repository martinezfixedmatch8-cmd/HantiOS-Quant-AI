import { ingestHistorical, type HistoricalIngestResult, type RawHistoricalRecord } from "./historical.pipeline.js";
import type { Timeframe } from "./candle.contract.js";

export type ProviderCapabilities = {
  historical: boolean;
  realtime: boolean;
  supportedTimeframes: readonly Timeframe[];
};

export type HistoricalRequest = {
  canonicalSymbol: string;
  timeframe: Timeframe;
  start: string;
  end: string;
  limit: number;
};

export type ProviderHistoricalResponse = {
  provider: string;
  sourceSymbol: string;
  records: RawHistoricalRecord[];
};

export interface MarketDataProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  fetchHistorical(request: HistoricalRequest): Promise<ProviderHistoricalResponse>;
}

export class ProviderContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderContractError";
  }
}

function parseUtc(value: string, field: string): number {
  if (!/(Z|[+-]00:00)$/.test(value)) throw new ProviderContractError(`${field} must include an explicit UTC offset`);
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new ProviderContractError(`${field} must be a valid ISO-8601 timestamp`);
  return parsed;
}

export function validateHistoricalRequest(request: HistoricalRequest, capabilities: ProviderCapabilities): void {
  const start = parseUtc(request.start, "start");
  const end = parseUtc(request.end, "end");
  if (start >= end) throw new ProviderContractError("start must be before end");
  if (!Number.isInteger(request.limit) || request.limit <= 0) throw new ProviderContractError("limit must be a positive integer");
  if (!capabilities.historical) throw new ProviderContractError("provider does not support historical candles");
  if (!capabilities.supportedTimeframes.includes(request.timeframe)) throw new ProviderContractError(`provider does not support timeframe ${request.timeframe}`);
}

export async function fetchAndNormalize(provider: MarketDataProvider, request: HistoricalRequest): Promise<HistoricalIngestResult> {
  validateHistoricalRequest(request, provider.capabilities);
  const response = await provider.fetchHistorical(request);
  if (response.provider !== provider.name) throw new ProviderContractError("provider response identity does not match the requested provider");
  return ingestHistorical(response.records.map((record) => ({ ...record, symbol: request.canonicalSymbol, timeframe: request.timeframe, provider: response.provider, sourceSymbol: response.sourceSymbol })), request.timeframe);
}

export class ReplayProvider implements MarketDataProvider {
  readonly name = "replay";
  readonly capabilities: ProviderCapabilities = { historical: true, realtime: false, supportedTimeframes: ["1m", "5m", "15m", "1h", "4h", "1d"] };

  constructor(private readonly sourceSymbol: string, private readonly records: RawHistoricalRecord[]) {}

  async fetchHistorical(request: HistoricalRequest): Promise<ProviderHistoricalResponse> {
    validateHistoricalRequest(request, this.capabilities);
    const start = parseUtc(request.start, "start");
    const end = parseUtc(request.end, "end");
    const records = this.records
      .filter((record) => {
        const timestamp = Date.parse(record.timestamp);
        return timestamp >= start && timestamp < end;
      })
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
      .slice(0, request.limit)
      .map((record) => ({ ...record, sourceSymbol: this.sourceSymbol, provider: this.name }));
    return { provider: this.name, sourceSymbol: this.sourceSymbol, records };
  }
}
