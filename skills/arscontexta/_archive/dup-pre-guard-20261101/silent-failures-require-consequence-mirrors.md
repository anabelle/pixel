---
description: Silent pipeline failures are harder to self-detect than loud ones, requiring external verification of actual outputs before any success verdict is issued.
kind: claim
topics: [[self]]
---

# silent-failures-require-consequence-mirrors

The assistant's silent pipeline failure went unnoticed until an external "consequence mirror" surfaced it, demonstrating that self-assessment without inspecting real outputs can produce false confidence. The corrective guard—requiring the actual post to be shown before rendering any verdict—generalizes: verify the artifact, not the intention. This pattern likely extends to any automated claim of task completion.

## Related Claims
[[verify-actual-output-before-verdict]], [[failure-detection-requires-external-feedback]]
