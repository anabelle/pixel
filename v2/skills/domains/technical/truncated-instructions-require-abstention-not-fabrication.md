---
description: When user instructions or input are cut off mid-sentence, the assistant must request clarification rather than guessing at the missing content or completing the task from assumption.
kind: claim
topics: [[technical]]
---

# truncated-instructions-require-abstention-not-fabrication

This pattern recurred across multiple platforms and dates: nostr-judge's rejection-criteria instructions cut off mid-sentence (2026-10-03), pixel-forge's document generation truncated mid-sentence (2026-10-04 and 2026-09-27), and a nostr-judge case where no draft was provided at all yet the assistant fabricated a rejection verdict anyway (2026-10-07). The most severe instance was inventing a verdict with zero input, which is a failure of grounding, not just truncation handling. The correct behavior is to detect incompleteness, stop, and explicitly ask for the missing content.

## Related Claims
[[verification-requires-askable-evidence]]
