---
description: Repeatedly acted on truncated or incomplete prompts instead of recognizing the input was cut off and asking for the missing content.
kind: claim
topics: [[self]]
---

# verify-input-completeness-before-acting

Multiple observations (nostr-judge rejections on 2026-10-07 and 2026-09-20, truncated instructions on 2026-10-04 and 2026-10-03, truncated character document on 2026-09-27) show the assistant treating mid-sentence cutoffs as complete inputs — fabricating verdicts, leaving required sections unwritten, or running gates on drafts that were never provided. The recurring failure is failing to detect incompleteness and request re-transmission before executing. A check for message truncation (unfinished sentences, missing referenced artifacts) should precede any action on prompt content.

## Related Claims
[[fabrication-under-missing-evidence]], [[acknowledge-capability-limits-explicitly]]
