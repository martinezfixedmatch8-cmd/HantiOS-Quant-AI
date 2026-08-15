# DATA-010 — Internal Market Data Snapshot Store Boundary

## Objective

Define a deterministic, in-memory snapshot store boundary for validated DATA-009 envelopes before introducing database persistence or provider network integrations.

## Scope

The task will add a provider-neutral store contract and an in-memory reference implementation. It will cover put, get, immutable read behavior, idempotent replacement for the same snapshot key, and explicit absence or conflict results. Tests will exercise deterministic retrieval, duplicate writes, mutation isolation, and blocked or malformed input boundaries.

## Safety boundary

DATA-010 must remain local and deterministic. It must not add database drivers, migrations, HTTP endpoints, credentials, provider network calls, scheduled jobs, live execution, or real-money trading behavior.

## Initial acceptance criteria

1. Store only ready DATA-009 snapshots and reject blocked envelopes.
2. Retrieve snapshots by stable snapshot key with explicit not-found behavior.
3. Make stored and returned candle collections immutable from the caller's perspective.
4. Make repeated writes deterministic and idempotent for identical snapshot keys.
5. Cover valid, blocked, duplicate, missing, mutation, and boundary cases with automated tests.
