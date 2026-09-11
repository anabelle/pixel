---
description: Systems must explicitly verify the structural and logical completeness of a text stream before granting approval or engagement status.
kind: claim
topics: [[technical]]
---

# detect-content-truncation-before-approval

Multiple failures occur when assistants treat truncated strings or mid-sentence cut-offs as valid, evaluable inputs. Without a specific check for logical completion or the presence of the actual content payload, the system risks hallucinating quality or providing premature approval based on partial data. Robust gatekeeping requires a "completeness handshake" to ensure the context provided is sufficient for a meaningful decision.

## Related Claims
[[context-integrity]], [[input-validation-rigor]]
