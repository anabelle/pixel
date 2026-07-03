---
description: Unhandled `model_not_supported` errors terminate a session before any actions are completed.
kind: claim
topics: [[technical]]
---

# model-not-supported-error-causes-session-death

Multiple captured interactions show the assistant receiving a `model_not_supported` error for `github-copilot/gpt-5.4` and instantly aborting the Syntropy session without notifying the user or attempting a fallback. This abrupt termination prevents recovery steps or graceful failure handling, leading to incomplete state updates and user frustration.

## Related Claims
[[concise-input-misinterpretation-with-overly-verbose-response]], [[model-failure-acknowledgement-omitted]]
