---
description: Any verdict about a deliverable (post, reply, output) must be based on the actual artifact, not on the assumption that it succeeded.
kind: claim
topics: [[technical]]
---

# verification-requires-consumed-artifact

The silent pipeline failure went undetected until an external "consequence mirror" surfaced it, revealing that self-reported success is unreliable evidence. The corrective guard — requiring the actual post to be fetched and inspected before rendering any verdict — generalizes: claims of completion should always be grounded in observed output. Silent failures are more insidious than loud ones precisely because they generate no error signal to trigger review.

## Related Claims
[[silent-failures-need-external-mirrors]], [[explicit-limitation-disclosure]]
