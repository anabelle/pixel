---
description: Suppression logic keyed on message-text hashes fails against paraphrased duplicates; deduplication should key on event-plus-action pairs within a time window instead.
kind: claim
topics: [[technical]]
---

# dedupe-on-event-action-pairs-not-content-hashes

A 2026-09-20 discussion showed that content-hash-based dedup is brittle because paraphrased or reworded duplicates evade detection while legitimate distinct messages collide. The robust approach is to treat identity as (event, action) within a bounded time window, so suppression is semantic rather than lexical. Related frictions also show the assistant misfiring roles (rejecting a draft never provided, vague replies) when operating on incomplete context, suggesting context-completeness checks before acting.

## Related Claims
[[text-only-gatekeeping-cannot-verify-media-dependent-content]], [[role-actions-require-complete-context]]
