---
description: Chain-of-thought or internal reasoning must never be published as the reply itself; a dry-run/sandbox step should separate internal output from outbound messages.
kind: claim
topics: [[self]]
---

# safeguard-review-before-send-not-after

A chain-of-thought was accidentally published as the actual reply, exposing the lack of a safeguard between model output and message send. Combined with related frictions (leak is recursive; sandbox/dry-run framing), the pattern suggests all outbound content should pass through a rendering check that filters internal reasoning artifacts before transmission.

## Related Claims
[[gatekeeper-must-reject-truncated-content]], [[sandbox-dry-run-for-outbound-messages]]
