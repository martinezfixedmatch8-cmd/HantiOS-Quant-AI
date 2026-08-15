# DATA-007 — Provider Selection and Deterministic Fallback Policy

## Objective

Add a provider-neutral routing layer above DATA-005 and DATA-006. The router chooses a provider only when its capability, symbol, timeframe, health, and ingestion quality state satisfy the request policy.

## Selection policy

Providers are evaluated by explicit priority order. A provider is eligible only when it supports historical candles and the requested timeframe, is not BLOCKED, and has a PASS quality state. HEALTHY providers are preferred. DEGRADED providers may be used only when the request explicitly allows degraded sources and no healthy provider is available.

Ties are resolved by priority and then provider name, so the result is deterministic and reproducible. Providers that are unsupported, blocked, or quality-failed are never silently selected.

## Failure behavior

When no eligible provider exists, the router returns a structured `NO_ELIGIBLE_PROVIDER` result with one reason per candidate. It does not make network calls, retry automatically, or fall back to execution.

## Safety boundary

DATA-007 contains only deterministic selection logic and tests. It does not add credentials, network adapters, persistence, scheduled jobs, live execution, or real-money trading.
