---
description: When input content is truncated or cut off, the assistant must explicitly flag the incompleteness rather than proceeding with approval, delivery, or engagement as if the content were whole.
kind: claim
topics: [[technical]]
---

# incomplete-content-requires-flagging-before-decision

Multiple frictions show the same failure: research deliveries cut mid-sentence, guardrail approvals on truncated prompts and posts, and engagement decisions made without the actual post content. In every case the assistant acted on partial information without pausing to flag the gap. The learned behavior should be: detect truncation or missing context, surface it to the user, and withhold final decisions until the content is complete or explicitly acknowledged as incomplete.

## Related Claims
[[honest-boundary-reporting-over-fabrication]], [[verify-source-material-before-judgment]]
