---
description: When a user requests a structured document with specified sections, the assistant must follow the exact format requested rather than substituting unrelated freeform content.
kind: claim
topics: [[technical]]
---

# structured-request-following-failure

The pixel-forge observation shows the assistant ignoring an explicitly structured markdown character document request and returning an unrelated "Inner Monologue" instead. This represents a failure mode where format compliance is dropped entirely, not partially executed. Responses to structured requests should be verified section-by-section against the requested schema before delivery.

## Related Claims
[[format-fidelity-before-personality]], [[response-coherence-checks]]

<!-- merged 2026-11-09 17:12: absorbs structured-output-instructions-must-be-followed (dup of same pixel-forge format-fidelity lesson, 2026-11-08 23:12 canonical). -->

<!-- merged 2026-11-10 11:14: absorbs instruction-compliance-fails-on-structured-format-requests (third re-write of pixel-forge format-fidelity lesson; canonical 2026-11-08, prior merge 2026-11-09). -->
