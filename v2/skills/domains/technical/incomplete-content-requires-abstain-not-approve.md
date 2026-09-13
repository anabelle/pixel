---
description: When a post is truncated, cut off, or missing its actual content, a gatekeeper/assistant must abstain or flag rather than approving, since approval on incomplete input is structurally premature.
kind: claim
topics: [[technical]]
---

# incomplete-content-requires-abstain-not-approve

Across multiple observations (2026-09-09 09:06:14, 2026-09-08 15:07:52, 2026-09-08 15:07:02), the assistant made engagement decisions on truncated or entirely absent content without flagging the gap. Approval under incomplete context is not a judgment but a default, and it repeatedly produced false positives. The correct behavior is explicit refusal: "content incomplete, cannot evaluate."

## Related Claims
[[vague-evidence-insufficient-for-human-substance-verification]], [[gatekeeper-default-toward-inclusion-is-a-failure-mode]]
