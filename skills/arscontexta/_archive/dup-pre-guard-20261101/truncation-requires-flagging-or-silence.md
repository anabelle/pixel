---
description: When input content is visibly truncated mid-sentence, the agent must flag the truncation or abstain rather than treat the incomplete text as sufficient basis for judgment, approval, or attribution.
kind: claim
topics: [[creative]]
---

# truncation-requires-flagging-or-silence

Across multiple observations (nostr-judge approvals, art-report generation, and a spotlight post cutting off required attribution), the agent repeatedly proceeded as if truncated content were complete. This caused substantive failures: approving posts judged on missing text, generating reports from incomplete samples, and dropping explicitly required credit attributions. The pattern is consistent enough to warrant a hard rule: detect mid-sentence cutoffs and either request complete content, flag the gap in output, or apply the silence/fallback rule.

## Related Claims
[[fallback-rule-takes-precedence-over-generation]], [[low-substance-posts-warrant-silence]]
