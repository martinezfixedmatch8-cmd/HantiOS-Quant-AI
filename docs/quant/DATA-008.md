# DATA-008 — Market Data Request Orchestration and Quality-Aware Fetch Plan

## Objective

Create a deterministic planning layer above DATA-007 provider routing. The planner validates a canonical market-data request, selects a safe provider, and returns a complete fetch plan without invoking a provider or making a network call.

## Planning order

The planner first validates explicit UTC start and end timestamps, ordering, positive limit, canonical symbol, and timeframe. It then asks the DATA-007 router for an eligible provider. If routing succeeds, the result carries the selected provider, exact request, degraded-policy setting, maximum freshness age, and a stable plan key.

## Safety behavior

Invalid requests are blocked before routing. A routing failure returns structured reasons and no partial plan. The planner itself never retries, calls external services, changes provider priority, or bypasses DATA-006 quality and health policy.

## Safety boundary

DATA-008 contains plan construction and tests only. It does not add credentials, network adapters, persistence, scheduled ingestion, execution, or real-money trading.
