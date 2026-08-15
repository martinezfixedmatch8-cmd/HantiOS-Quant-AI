# DATA-005 — Market Data Provider Contract and Replayable Source Interface

## Objective

Define the provider-neutral boundary between market-data sources and the DATA-004 historical ingestion pipeline. This task makes future MT5, Binance, TwelveData, Polygon, and other adapters interchangeable without allowing provider-specific payloads to leak into downstream modules.

## Contract

A provider implements a capability descriptor and a historical-candle request method. The request requires canonical symbol, timeframe, UTC start and end timestamps, and a positive limit. The response identifies the provider and source symbol and contains raw records that are passed through DATA-004 normalization.

## Replay behavior

The local replay source implements the same provider-neutral interface using an in-memory record set. It performs no network calls, returns records deterministically within the requested UTC range, and exposes the provider identity so historical evidence can be reproduced in tests.

## Safety boundary

DATA-005 defines interfaces and a local replay implementation only. It does not add credentials, external API calls, production adapters, database persistence, scheduled ingestion, execution, or real-money trading.

## Acceptance evidence

AC-01 is evidenced by the provider capability, request, response, and provider interface types. AC-02 is evidenced by deterministic local replay tests. AC-03 is evidenced by replay output flowing through `ingestHistorical` with provider/source identity preserved. AC-04 is evidenced by invalid range, unsupported capability, and invalid-limit tests with explicit rejection reasons.
