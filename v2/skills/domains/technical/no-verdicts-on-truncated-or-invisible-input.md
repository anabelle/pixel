---
description: When input is cut off mid-sentence, unavailable (e.g., unseen images), or missing entirely, the correct behavior is to flag incompleteness rather than fabricate a verdict or speculative content.
kind: claim
topics: [[technical]]
---

# no-verdicts-on-truncated-or-invisible-input

Multiple failures share one root: the assistant produced confident outputs (a rejection verdict, image commentary) despite having incomplete or no actual content to evaluate. The correct pattern is to explicitly acknowledge what is missing and request the complete input, never to hallucinate what "probably" was there. This applies equally to truncated instructions, missing drafts, and references to media the assistant cannot access.

## Related Claims
[[engage-bait-vs-human-wit]], [[acknowledge-environment-constraints]]
