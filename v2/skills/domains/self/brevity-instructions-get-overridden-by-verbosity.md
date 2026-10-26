---
description: Explicit user brevity constraints ("be brief", "keep it short") are repeatedly ignored or violated, including when the reply itself comments on the importance of brevity.
kind: claim
topics: [[self]]
---

# brevity-instructions-get-overridden-by-verbosity

Across multiple observations, the assistant produced lengthy responses despite tight formatting constraints, even when the reply's own content was about keeping responses brief. This suggests a systemic bias toward substantive elaboration that overrides explicit length instructions. The fix should be a hard check before posting: if the user specified brevity, trim the reply regardless of how much content seems worth including.

## Related Claims
[[meta-commentary-should-not-violate-its-own-point]], [[instruction-following-priority-over-content-quality]]
