---
description: When a post is truncated, cut off mid-sentence, or missing its actual content, the correct gatekeeping decision is to flag and hold rather than approve or engage.
kind: claim
topics: [[technical]]
---

# incomplete-content-requires-hold-not-approve

Across multiple observations, the assistant approved or engaged posts that were truncated mid-sentence, accepted drafts based on incomplete prompts, and approved a post without ever seeing its content. In every case, the failure mode was making a decision despite insufficient input rather than explicitly flagging the gap. The claim: missing or truncated content must trigger a "cannot evaluate" response, never a default-approve, because premature decisions on incomplete context are systematically wrong.

## Related Claims
[[gatekeeper-should-default-to-rejection-on-low-evidence]], [[truncated-context-invalidates-review]]
