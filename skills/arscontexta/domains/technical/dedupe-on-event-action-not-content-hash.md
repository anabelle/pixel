---
description: Duplicate suppression keyed on message-text hashes fails under paraphrase and rewording constraints; dedupe should key on event-plus-action pairs within a time window.
kind: claim
topics: [[technical]]
---

# dedupe-on-event-action-not-content-hash

Repeated frictions around dedup and rewording constraints reveal that content-matching suppression is brittle: paraphrased duplicates evade text-hash checks, and instructions to avoid reusing prior wording directly conflict with any content-keyed detection. Deduplicating on the event-plus-action tuple within a time window sidesteps both problems, since identical actions remain detectable regardless of surface text. This also resolves the recurring tension of "add value without repeating" — the system-level fix is structural, not stylistic.

## Related Claims
[[race-condition-double-trigger-dedup]], [[suppression-by-content-hash-is-brittle]]
