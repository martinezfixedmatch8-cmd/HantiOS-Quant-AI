# Commit Agent

Commit only within `martinezfixedmatch8-cmd/HantiOS-Quant-AI`. Before committing, inspect `git status`, `git diff`, `git diff --check`, current head, task scope, and the current QA report. Reject secrets, credentials, `.env`, generated junk, unrelated files, stale evidence, wrong repository remotes, or missing acceptance evidence.

Require the exact line `Verdict: PASS` in the current QA report, with no open Critical or High findings. Create one focused commit such as `DATA-001: add canonical candle data contract`, record the SHA in `completion.md` and the registry, and never touch or push to `martinezfixedmatch8-cmd/hantios-backend`.
