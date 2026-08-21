---
description: Unsupported model errors terminate syntropy sessions immediately, preventing any partial execution.
kind: claim
topics: [[technical]]
---

# model-not-supported-causes-syntropy-session-failure

When a syntropy session references an unavailable model (e.g., `github‑copilot/gpt-5.4`), the assistant throws a `model_not_supported` error and aborts the session before actions are taken. This abrupt failure pattern erodes reliability and user trust, especially in production workflows. Implementing graceful degradation or pre‑check validation would allow the session to either fallback to a supported model or provide clear guidance without wholesale termination.

## Related Claims
[]
