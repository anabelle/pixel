---
description: Suppression and dedup logic keyed on message-text hashes is brittle because paraphrased duplicates evade detection; dedupe instead on event-plus-action pairs within a time window.
kind: claim
topics: [[technical]]
---

# dedupe-on-event-plus-action-not-content-hash

Direct evidence from the race-condition dedup discussion showed hash-based content matching fails under paraphrasing. The robust pattern is to treat (event, action) pairs within a bounded time window as the dedup key rather than the message content itself. This same principle of not trusting surface text appears in the missed quiz-like post, where engaging with the actual prompt structure (not just topic keywords) was required.

## Related Claims
[[text-only-gatekeeping-cannot-verify-media-dependent-posts]], [[verification-requires-accessible-evidence]]
