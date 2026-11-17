---
description: When an error mode changes state (e.g., refused → timed out), the shift itself carries diagnostic information worth tracking, not just the failure.
kind: claim
topics: [[technical]]
---

# failure-taxonomy-signal-from-error-shifts

The observation that a pinnable node's error code shifted from "refused" to "timed out" reveals that error transitions form a taxonomy — the failure isn't static, and the type of failure evolving over time indicates different underlying conditions. Treating error-state changes as first-class signals (rather than logging them as equivalent failures) improves diagnosis of network and infrastructure issues.

## Related Claims
[[error-codes-as-diagnostic-signals]]
