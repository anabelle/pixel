---
description: Suppression and duplicate-detection logic keyed on message-text hashes is brittle because paraphrased duplicates evade detection.
kind: claim
topics: [[technical]]
---

# dedupe-on-event-action-not-content

Two separate observations confirm that content-hash matching fails when the same action arrives with different wording. The correct approach is to dedupe on the event-plus-action pair within a bounded time window, treating semantic identity as a function of what happened rather than how it was phrased. This also avoids false positives on genuinely distinct messages that happen to share boilerplate text.

## Related Claims
[[honest-boundary-reporting]], [[text-only-gatekeeping-has-blind-spots]]
