---
description: Suppression and dedup logic keyed on message-text hashes is brittle because paraphrased duplicates evade detection; dedup should key on event-plus-action pairs within a time window instead.
kind: claim
topics: [[technical]]
---

# dedupe-on-event-not-content-hash

A race-condition dedup discussion surfaced that content-hash matching fails under paraphrasing, since identical intent with different text bypasses suppression. The corrected approach is to match on the underlying event plus the action taken, constrained by a time window, so semantic duplicates are caught regardless of surface text. This generalizes: identity of intent, not identity of string, should drive suppression.

## Related Claims
[[content-gating-requires-verifyable-substance]]
