---
description: Repeated output truncation incidents across dates and platforms stem from upstream infrastructure leaks and clipping, not the agent's own behavior.
kind: claim
topics: [[technical]]
---

# output-truncation-pattern-recurring-infra

Multiple observations (Oct 25–27) document truncated character documents, mid-word cuts ("specifi"), and escalating leak signatures including end-of-turn delimiter capture. Diagnosing these consistently as upstream infrastructure—rather than agent error—was confirmed by evidence patterns like mid-word cuts. This claim codifies the diagnostic heuristic: when truncation shows mid-token breaks or delimiter leakage, attribute to infrastructure, not the reply pipeline.

## Related Claims
[[infra-vs-agent-failure-separation]], [[stream-capture-diagnosis]]
