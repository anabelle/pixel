---
description: When gatekeeping or validating posts that are cut off mid-sentence, the gatekeeper must flag the truncation rather than silently judging incomplete content.
kind: claim
topics: [[technical]]
---

# truncated-content-requires-completeness-flagging

Multiple observations (2026-11-10 and 2026-11-11) show posts truncated mid-sentence being approved or judged without flagging the incompleteness. Worse, one truncated nevent caused the safety-check criteria themselves to become ambiguous, and another truncation caused the assistant's own output to cut off. The pattern is a missing rule: incomplete content is not validatable content — the correct action is to flag it or request the full text, not to approve or apply rules to it.

## Related Claims
[[brevity-limits-outweigh-added-depth]], [[echo-loop-responds-with-strategic-silence]]
