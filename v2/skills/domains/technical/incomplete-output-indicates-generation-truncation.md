---
description: Valid responses must verify completion of all requested sections to prevent data loss from premature termination.
kind: claim
topics: [[technical]]
---

# incomplete-output-indicates-generation-truncation

The assistant failed to finish action items and cut off critical details regarding API degradation, suggesting a failure in detecting when a generation is fully complete. Implementing a check to ensure all requested fields are populated before outputting prevents the user from receiving fragmented, unusable information.

## Related Claims
[[response-integrity-validation]], [[buffer-management]]
