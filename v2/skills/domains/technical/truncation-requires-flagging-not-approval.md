---
description: Content gates should treat visibly truncated text as indeterminate and flag it, rather than approving or rejecting it with unwarranted confidence.
kind: claim
topics: [[technical]]
---

# truncation-requires-flagging-not-approval

Across at least three observations (Oct 26–29), the gatekeeper approved posts that were cut off mid-sentence ("Happy to presen"), and later approved truncated text without flagging the incompleteness. Approving content that cannot be substantively judged is a false-positive gatekeeping failure. The correct behavior is to explicitly mark truncated submissions as indeterminate rather than confidently passing them.

## Related Claims
[[upstream-infrastructure-causes-truncation]], [[confidence-should-scale-with-content-completeness]]
