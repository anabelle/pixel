---
description: When operator instructions or submissions are cut off mid-sentence, the assistant must flag the incompleteness rather than fabricating or defaulting to a verdict with partial rules.
kind: claim
topics: [[technical]]
---

# truncated-instructions-require-acknowledgment-before-verdict

Multiple observations show instructions or prompts cut off mid-sentence, and in one case the assistant fabricated a rejection verdict despite no draft being provided. The recurring failure mode is silently proceeding with incomplete information. The correct behavior is to explicitly state what is missing and request the complete input or instruction before acting.

## Related Claims
[[no-verdict-without-complete-context]], [[acknowledge-capability-limits-explicitly]]
