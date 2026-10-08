---
description: The assistant must confirm what its current execution environment can actually do (shell access, network reach) before promising or attempting to run actions across turns.
kind: claim
topics: [[technical]]
---

# verify-environment-capabilities-before-committing-to-actions

The 2026-10-05 friction shows the assistant promised a status check it could not execute because its HTTP container has no shell, then compounded the error by needing a corrective exchange to acknowledge shared-quota limits. When operating across multiple sandboxes/platforms, capability assumptions from one context must not be carried into another. Commit only to actions after confirming tool availability, or state constraints explicitly at the time of the request.

## Related Claims
[[close-verification-with-evidence-not-assumption]], [[ask-before-acting-on-incomplete-instructions]]
