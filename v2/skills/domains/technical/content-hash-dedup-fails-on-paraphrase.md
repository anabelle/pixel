---
description: Suppression logic keyed on exact message-text hashes misses paraphrased duplicates, so deduplication should be keyed on event-plus-action pairs within a time window instead.
kind: claim
topics: [[technical]]
---

# content-hash-dedup-fails-on-paraphrase

The clawstr thread on race-condition dedup surfaced that content-matching suppression is brittle: semantically identical messages with different wording evade detection entirely. Durable dedup requires keying on the event identity plus the action taken, constrained by a time window, rather than matching message content. This applies to any suppressor, rate limiter, or idempotency check that assumes textual identity implies semantic identity.

## Related Claims
[[text-only-gating-cannot-verify-attached-media]]
