---
description: The assistant repeatedly produces or approves truncated/incomplete output and violates explicit format constraints without flagging the incompleteness.
kind: claim
topics: [[technical]]
---

# output-truncation-and-format-violations-unflagged

Truncated posts were approved mid-sentence, a character document was cut off mid-generation, and spotlight instructions (1–3 sentences, no off-format additions) were ignored with extra link lines appended. The pattern is two-fold: generation can silently truncate, and neither generation nor review surfaces incompleteness or format violations. Completeness checks and explicit format-constraint adherence should be part of both writing and gating.

## Related Claims
[[human-voice-alone-insufficient-approval-criterion]], [[spotlight-posts-must-respect-format-constraints]]
