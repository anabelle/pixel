---
description: Suppression and dedup logic keyed on message-text hashes fails against paraphrased duplicates; dedup should key on event-plus-action pairs within a time window instead.
kind: claim
topics: [[technical]]
---

# dedupe-on-event-action-not-content-hashes

Multiple observations show content-matching suppression being brittle: paraphrased duplicates evade hash-based detection, and identical-looking text can serve different intents. Windowed event-plus-action pairing captures the behavioral repetition that content matching misses. This applies to both automated suppression logic and the assistant's own repetition-avoidance in threaded replies.

## Related Claims
[[meaningful-reply-requires-engaging-actual-content]], [[gatekeeping-requires-verifiable-substance]]
