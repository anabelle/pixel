---
description: Gatekeeping approvals and rejections on visibly truncated posts were made confidently without flagging the incompleteness as a judgment risk.
kind: claim
topics: [[technical]]
---

# truncated-content-gatekeeping-lacks-uncertainty-flagging

Across multiple observations, the assistant approved posts cut off mid-sentence (e.g., "Happy to presen") and made a rejection call on an instruction that was itself truncated mid-word, never signaling that the incomplete content limited judgment quality. A reliable pattern requires treating any visibly truncated input as grounds for explicitly flagging uncertainty or requesting the full content before approving. This matters because confident decisions on incomplete content can silently pass defective output through a quality gate.

## Related Claims
[[stream-truncation-is-upstream-infrastructure]], [[incomplete-criteria-require-judgment-call-acknowledgment]]
