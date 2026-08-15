# DATA-001 — Canonical Candle Data Contract

## Objective

Create the first backend data-foundation contract for HantiOS Quant AI. All future provider adapters, session checks, indicators, strategies, backtests, and AI decisions must consume a normalized candle representation rather than provider-specific payloads.

## Scope

This task normalizes symbols, timeframes, timestamps, provider identifiers, OHLC values, and volume. It rejects invalid market data before persistence or downstream analysis and emits a stable deduplication key based on canonical symbol, timeframe, and UTC timestamp.

Provider network calls, database persistence, AI ranking, paper orders, live execution, migrations, credentials, and production configuration are explicitly excluded.

## Acceptance evidence

AC-01 is evidenced by normalization tests for `xau/usd`, timeframe, provider, and timestamp. AC-02 is evidenced by rejection tests for non-UTC timestamps, invalid OHLC relationships, unsupported timeframes, and non-positive volume. AC-03 is evidenced by the stable `XAUUSD:1h:<timestamp>` key assertion. AC-04 is evidenced by the complete Node test file covering valid, invalid, boundary, and duplicate-key behavior.

## Design decision

The contract is framework-free and deterministic. A later provider adapter may translate provider-specific field names into `CandleInput`, but it cannot bypass this validation boundary.
