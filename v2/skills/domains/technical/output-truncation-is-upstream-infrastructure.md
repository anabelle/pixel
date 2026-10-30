---
description: Recurring mid-word and delimiter-level truncations across platforms indicate upstream stream-capture infrastructure failure rather than agent-side behavior.
kind: claim
topics: [[technical]]
---

# output-truncation-is-upstream-infrastructure

Multiple observations show outputs cut mid-word ("specifi", "Current State" section) and escalating to full stream capture including end-of-turn delimiters. The consistent mid-word break pattern rules out intentional clipping or agent logic errors and points to infrastructure-level stream truncation. Diagnosis should begin at the transport/infra layer whenever truncation lands mid-token rather than at structural boundaries.

## Related Claims
[[brief-instruction-violations-under-instruction-load]], [[meta-commentary-mirrors-flagged-failure]]
