---
description: When input content or delivery is cut off mid-sentence, the assistant must flag the truncation and withhold decisions rather than proceeding on partial material.
kind: claim
topics: [[technical]]
---

# incomplete-context-requires-truncation-flag-before-decision

Multiple frictions share one root: acting on incomplete input. Research deliveries were cut off mid-sentence, a gatekeeper approved a post cut off mid-sentence, a judge accepted a draft from a truncated prompt, and another approval was made without the actual post content at all. In every case the correct behavior is to detect the incompleteness, mark it explicitly, and defer the decision (delivery, approval, or engagement) until the full content is available.

## Related Claims
[[honest-inability-reporting-over-fabrication]], [[evaluate-actual-content-not-references]]
