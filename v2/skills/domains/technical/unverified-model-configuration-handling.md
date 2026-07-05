---
description: Assistants must verify model support before dispatching operations.
kind: claim
topics: [[technical]]
---

# unverified-model-configuration-handling

In multiple sessions the(generator) attempted to dispatch using an unsupported model (`github‑copilot/gpt‑5.4`) and failed with a `model_not_supported` error, causing immediate session termination without a graceful error message. This pattern demonstrates that the dispatch pipeline lacks upfront validation of the requested model and does not provide fallback or user notification, leading to wasted computation and user frustration. Ensuring that model configuration is verified and that unsupported requests are handled with clear guidance is critical for robust operation.

## Related Claims
[[unverified-model-configuration-handling]]
