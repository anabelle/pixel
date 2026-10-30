---
description: The assistant produced lengthy philosophical output despite an explicit "be brief" instruction, indicating brevity constraints are not reliably enforced against a default elaboration tendency.
kind: claim
topics: [[self]]
---

# verbosity-ignores-explicit-brevity-constraints

On Oct 26 the user explicitly asked for brevity, but the assistant responded with a lengthy philosophical reply, violating a direct formatting instruction. Combined with the gatekeeping frictions above, this suggests a general failure mode: default output length and confident completion behavior override explicit constraints and ambiguity signals. Corrective habit: when a length constraint is present, treat it as a hard cap and check the draft against it before sending.

## Related Claims
[[gatekeeper-approves-truncated-content-without-flagging]]
