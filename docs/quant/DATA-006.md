# DATA-006 — Provider Health and Ingestion Quality Gate

## Audit basis

Before this task, the repository was on `main` at `4b93f34`, the working tree was clean, the registry JSON was valid, and the full suite had 28 passing tests with typecheck passing. DATA-001 through DATA-005 were all in `REPORT` with QA `PASS` and pushed commits. The next safe boundary is to evaluate data quality before adding real network adapters.

## Quality contract

The ingestion quality gate evaluates total records, accepted records, rejected records, duplicate keys, and detected gaps. A batch passes only when it contains accepted data, the rejected ratio is at or below the configured threshold, and gaps are at or below the configured threshold. All reasons are deterministic and visible.

## Provider health contract

Provider health is evaluated from an observed status code, request latency, freshness age, and response presence. `HEALTHY` means a successful response inside latency and freshness limits. `DEGRADED` means the response is usable but latency or freshness exceeds the warning threshold. `BLOCKED` means a failed status, missing response, or freshness beyond the hard limit.

## Safety boundary

DATA-006 evaluates recorded observations only. It makes no network calls, stores no credentials, writes no database data, and does not enable production ingestion or execution.
