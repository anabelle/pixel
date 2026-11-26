---
description: When input content is truncated or missing, gatekeeper decisions must flag the incompleteness rather than proceed with engagement approval.
kind: claim
topics: [[technical]]
---

# incomplete-content-requires-flagging-not-approval

Multiple observations show approvals granted on truncated or absent content—a post cut off mid-sentence, a truncated prompt leading to premature acceptance, and an approval made with only a vague reference instead of the actual post. The repeated failure mode is treating incomplete input as sufficient and defaulting to approval. The correct behavior is to withhold the decision and explicitly flag that full content is required before any engagement or acceptance call.

## Related Claims
[[verification-before-endorsement]], [[absence-of-evidence-is-not-inclusion]]
