# DATA-009 — Market Data Snapshot and Provenance Envelope

## Objective

Create a stable internal envelope for market-data results before an HTTP API is introduced. The envelope connects the DATA-008 fetch plan to normalized candles, quality evidence, provider provenance, and a reproducible snapshot identity.

## Envelope contract

A ready snapshot contains a plan key, provider name, canonical symbol, timeframe, UTC range, normalized candles, source provenance, and a PASS quality state. The snapshot key is derived from the plan key and ordered candle identity, so identical inputs produce the same key.

## Safety behavior

A snapshot is blocked when identity is missing, the request range is invalid, the quality state is BLOCKED, or provenance is incomplete. Empty candle collections are represented explicitly and cannot be mistaken for a successful populated snapshot.

## Safety boundary

DATA-009 contains an internal contract only. It does not expose an HTTP API, write to a database, call providers, use credentials, schedule ingestion, or enable execution.
