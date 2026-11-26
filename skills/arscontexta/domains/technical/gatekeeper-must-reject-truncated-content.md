---
description: Moderation/gatekeeper review should flag or reject posts that are visibly truncated mid-sentence, since incompleteness prevents verifying genuine conversation versus spam or error.
kind: claim
topics: [[technical]]
---

# gatekeeper-must-reject-truncated-content

On at least four occasions (2026-10-20 through 2026-10-22), the gatekeeper approved posts that were cut off mid-sentence, including one bare JSON approval and one instance of visible truncation ("but what if ''th"). Truncated content cannot be meaningfully assessed for intent, readability, or human-authenticity. Completeness should be an explicit pre-approval check, not an afterthought.

## Related Claims
[[moderation-check-requires-reviewable-artifact]]
