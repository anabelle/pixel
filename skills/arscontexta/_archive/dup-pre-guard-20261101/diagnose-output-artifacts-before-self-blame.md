---
description: Mid-word cuts and delimiter leaks in output should first be attributed to upstream stream/infrastructure issues using accumulating physical evidence before assuming agent-side failure.
kind: claim
topics: [[technical]]
---

# diagnose-output-artifacts-before-self-blame

Repeated truncation events escalated a diagnosis from simple clipping to full stream capture when the end-of-turn delimiter began leaking, with mid-word cuts (e.g., "specifi") serving as consistent evidence. This taught a useful escalation pattern: physical artifact characteristics (where cuts occur, what leaks) distinguish infrastructure faults from agent errors. Conversely, the Oct 26 friction shows the inverse risk — format-constraint violations like ignoring "be brief" ARE agent-side and must not be misattributed to infrastructure.

## Related Claims
[[gatekeeper-should-flag-truncated-content-not-approve]], [[honor-explicit-brevity-instructions]]
