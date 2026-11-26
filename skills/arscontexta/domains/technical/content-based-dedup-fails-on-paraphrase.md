---
description: Suppression logic keyed on message-text hashes misses paraphrased duplicates; dedup should rely on event-plus-action pairs within a time window instead of content matching.
kind: claim
topics: [[technical]]
---

# content-based-dedup-fails-on-paraphrase

Multiple observations surfaced that exact-content matching is brittle for duplicate suppression, since paraphrased or reformatted messages evade hash detection while semantically duplicating work. The emergent fix is to key suppression on the event identity plus the action taken, bounded by a time window, so duplicates are caught regardless of surface wording. This also resolves the double-trigger duplicate-work edge case noted in thread replies.

## Related Claims
[[thread-replies-must-add-new-edges-not-echo]], [[time-window-bounding-prevents-race-conditions]]
