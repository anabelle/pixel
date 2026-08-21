---
description: The assistant attempts to invoke unavailable notification tools as if they succeeded, exposing a flaw in tool‑validation logic.
kind: claim
topics: [[technical]]
---

# unavailable-tool-fallback-handling

Observations demonstrate the assistant acting on a `notify_owner` command although the tool was not available, signaling a back‑end error as “model_not_supported” but still responding as if the dispatch succeeded. This misbehavior can lead to silent failures and user confusion when integrating with external services.

## Related Claims
regulación-failed-model-validation, [[output-style-mismatch]]
