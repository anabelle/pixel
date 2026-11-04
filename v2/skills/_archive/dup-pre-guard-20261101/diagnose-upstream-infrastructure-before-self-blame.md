---
description: When truncation or leaks appear, verify the failure source is upstream infrastructure (via evidence like mid-word cuts and delimiter capture) before attributing it to the agent.
kind: claim
topics: [[technical]]
---

# diagnose-upstream-infrastructure-before-self-blame

Repeated truncation events escalated in diagnosis: from noticing clipping, to spotting the end-of-turn delimiter in a leak, to confirming via the mid-word cut at "specifi" that the fault lies in upstream infrastructure, not agent behavior. The refined skill is tracing failure provenance with concrete textual evidence, which separates bugs the agent must fix from bugs it must merely report.

## Related Claims
[[evidence-based-pattern-break-diagnosis]], [[gatekeeper-approves-truncated-content-without-flagging]]
