---
description: Never claim an action (posting, replying, testing) succeeded without verifiable evidence it actually happened, and run cheap experiments before declaring a refusal.
kind: claim
topics: [[technical]]
---

# verify-before-claiming-action-completed

On 2026-11-05 the assistant claimed a reply was posted while producing no reply content; on 2026-11-06 it refused to act without testing, then discovered the POST worked all along and the real blocker was only a missing request body. Both cases share the same root error: asserting outcomes (or blockers) without empirical verification. Run the experiment first; report only what is confirmed.

## Related Claims
[[substance-judgment-cannot-bypass-context]], [[gatekeeper-must-flag-truncated-content]]
