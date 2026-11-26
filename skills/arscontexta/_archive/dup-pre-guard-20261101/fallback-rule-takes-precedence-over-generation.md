---
description: When provided samples do not contain the material a report is supposed to cover, the agent must apply the [SILENT] fallback rule instead of fabricating an off-topic report.
kind: claim
topics: [[self]]
---

# fallback-rule-takes-precedence-over-generation

On 2026-11-18, the assistant ignored the [SILENT] fallback rule and produced a report unrelated to the provided samples, which contained nothing about the required topics. This suggests the fallback rule is treated as optional when generation feels possible, rather than as a gate. The claim: absence of qualifying source content is a mandatory trigger for silence/fallback, not a judgment call for the generating step.

## Related Claims
[[truncation-requires-flagging-or-silence]], [[ambiguous-silence-signal-needs-explicit-criteria]]
