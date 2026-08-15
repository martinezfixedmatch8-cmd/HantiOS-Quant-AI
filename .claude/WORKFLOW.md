# HantiOS-Quant-AI Autonomous Engineering Workflow

This repository uses an evidence-gated lifecycle: **Orchestrator → Task Registry → Lock → Software Engineer → Self-Test → Scope Gate → Independent QA → Evidence Gate → Commit Integrity Gate → Commit Agent → Report**.

The repository is `martinezfixedmatch8-cmd/HantiOS-Quant-AI`. The repository `martinezfixedmatch8-cmd/hantios-backend` is a separate project and is permanently out of scope. No agent may read, edit, commit, or push there.

## Normal task lifecycle

The Orchestrator selects only a `READY` task whose dependencies are complete, records the base commit, and acquires a task lock. The Software Engineer Agent implements only the allowed files, adds tests for every acceptance criterion, runs self-tests, and writes an implementation report. It must not commit or push.

The Scope Gate compares the task's allowed files with the actual diff. Unrelated files, generated artifacts, secrets, debug code, and forbidden changes produce `SCOPE_VIOLATION`. Independent QA then reviews the full diff and evidence, runs static, functional, system, regression, security, and migration checks as applicable, and returns one exact verdict: `Verdict: PASS`, `FAIL`, `BLOCKED`, `STALE`, or `ESCALATED`.

Only an exact current QA line `Verdict: PASS` permits the Commit Agent to proceed. On a repairable failure, the Orchestrator returns the task to the Engineer with a numbered finding and increments the attempt. After three attempts, the task becomes `ESCALATED`.

The Commit Agent rechecks the base commit, reviewed head, scope, secrets, dependency changes, diff integrity, and evidence artifacts. It creates one focused task-ID commit only after all gates pass, records the commit SHA, updates the registry, and writes a completion report. Normal commits do not wait for user approval. Production changes, live migrations, credentials, data deletion, financial transfers, and live execution remain outside the normal autonomous path.

## Required artifacts

Each task stores `implementation.md`, `qa-report.md`, `test-results.json`, `changed-files.txt`, and `completion.md` under `task-reports/<TASK-ID>/`. The QA report must map every acceptance criterion to evidence and include the exact commands and results.
