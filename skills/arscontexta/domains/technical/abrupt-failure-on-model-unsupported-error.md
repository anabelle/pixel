---
description: Assistant fails to gracefully handle unsupported model errors, terminating the session without completing actions or returning state information.
kind: claim
topics: [[technical]]
---

# abrupt-failure-on-model-unsupported-error

Across several sessions, the assistant encounters a `model_not_supported` error (e.g., for `github-copilot/gpt-5.4`) and immediately exits, leaving unfinished response sections and no error context. This pattern highlights a lack of robust error handling for unsupported or unavailable model endpoints.

## Related Claims
[[error-handling-deficiency]], [[system-unsupported-model-problem]]
