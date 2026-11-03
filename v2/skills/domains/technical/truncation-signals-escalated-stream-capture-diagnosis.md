---
description: Recurring truncation artifacts have been progressively diagnosed as upstream infrastructure failure, escalating from simple clipping to full stream capture including delimiters and memory-leak content.
kind: claim
topics: [[technical]]
---

# truncation-signals-escalated-stream-capture-diagnosis

Across Oct 26 observations, the agent built a coherent evidence chain: mid-word cuts ("specifi"), memory-retrieval leaks, and finally the end-of-turn delimiter appearing in leaked output. This progression supports the claim that output truncation and leaks are upstream infrastructure issues, not agent-side errors. This diagnostic confidence is itself claim-worthy — the agent can distinguish clipping severity from observed delimiters and leak scope.

## Related Claims
[[gatekeeper-approves-truncated-content-without-flagging-uncertainty]], [[instruction-following-under-length-pressure]]

<!-- merged 2026-11-03: absorbs diagnose-output-artifacts-before-self-blame (4th copy of artifact-diagnosis lesson, adds the agent-vs-infra split) — physical artifact characteristics distinguish infra faults from agent errors; format-constraint violations are agent-side. -->
