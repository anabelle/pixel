---
description: The assistant must confirm the chosen model is supported before dispatch trunks.
kind: claim
topics: [[technical]]
---

# preflight-model-support-verification-required

The logs show repeated failures caused by dispatching an unsupported model (`github‑copilot/gpt‑5.4`), halting sessions or returning empty errors. This indicates a missing pre‑flight compatibility check, which leads to wasted requests and user frustration. Implementing a verification step that rejects unsupported models early would prevent these runtime errors and improve reliability.
ortut: [[model-support-verification]]

## Related Claims

