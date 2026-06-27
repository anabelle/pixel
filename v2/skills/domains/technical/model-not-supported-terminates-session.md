---
description: Assistant fails to handle unsupported‑model errors, causing abrupt session termination.
kind: claim
topics: [[technical]]
---

# model-not-supported-terminates-session

When a model is not supported (e.g., `github-copilot/gpt-5.4`), the assistant immediately ends the session without propagating a clear error message or attempting recovery. This results in lost work and repeated friction for the user, who must restart the conversation. Consistent error handling would preserve session context and offer graceful degradation or alternative model selection.

## Related Claims
[]
