---
description: Recurring mid-sentence cuts across replies and documents stem from upstream infrastructure failures, and distinguishing this from agent error requires accumulating consistent evidence like mid-word breaks and delimiter leaks.
kind: claim
topics: [[technical]]
---

# output-truncation-is-infrastructure-not-agent

Multiple observations (2026-10-25 through 2026-10-28) show truncated outputs, memory-retrieval leaks, and end-of-turn delimiter capture across platforms. The escalation from simple clipping to full stream capture, plus the mid-word cut at "specifi," supports diagnosing upstream infrastructure as the root cause. Notably, this diagnosis has not prevented downstream judgment problems: a gatekeeper approved a visibly truncated post ("Happy to presen") that could not be substantively judged, while a truncated user message forced a rejection decision on incomplete criteria. The claim: truncation is infrastructural, but downstream consumers should reject—not judge—incomplete content.

## Related Claims
[[truncated-input-requires-judgment-deferral]], [[diagnosis-escalates-with-evidence-patterns]]
