# DATA-004 — Data Pipeline Normalization and Historical Data Ingestion

## Phase 0 — Pipeline contract and safety boundary

The pipeline accepts provider-shaped raw historical records and emits canonical candles through the existing DATA-001 contract. Every accepted record retains source metadata including provider, source row number, and source symbol. Invalid records are reported with structured reasons rather than silently discarded.

The pipeline is deterministic: accepted candles are ordered by UTC timestamp, duplicate canonical candle keys are collapsed using a first-record policy, and gaps are reported against the requested timeframe. This phase is intentionally local and framework-free. It does not call providers, write to a database, run scheduled jobs, handle credentials, or enable execution.

## Phase 1 — Local historical ingestion implementation

Phase 1 implements an in-memory ingestion function for historical batches. It normalizes each raw record with `normalizeCandle`, preserves accepted source metadata, records rejected rows, removes duplicate canonical keys, sorts output chronologically, and reports missing intervals between the first and last accepted candles.

The gap detector uses the timeframe duration from the canonical validation layer. It reports missing timestamps without inventing candles or mutating source values. A batch with no accepted candles returns an empty accepted set and a structured `NO_ACCEPTED_CANDLES` report reason.

## Acceptance criteria and evidence

AC-01 is evidenced by normalization tests that verify canonical output and source metadata preservation. AC-02 is evidenced by deterministic ordering and duplicate-key tests. AC-03 is evidenced by invalid-record and gap-report tests. AC-04 is evidenced by repeated-batch equality and boundary-case tests, plus the full regression suite.

## Safety boundary

DATA-004 is DATA risk class. Database persistence, external provider calls, economic calendar integration, AI ranking, production ingestion schedules, credentials, live execution, and real-money trading are out of scope.
