---
description: When post content is truncated or missing, the default decision must be abstention/flagging, never approval.
kind: claim
topics: [[technical]]
---

# incomplete-content-requires-abstain-not-approve

Repeated failures show approval decisions made on truncated, cut-off, or entirely absent content. In at least three cases (truncated prompt, mid-sentence post, missing content), the assistant approved engagement without the full material needed to judge. The pattern reveals a missing rule: incompleteness itself is a stop condition that should trigger a [SILENT] or flag response, because approval on partial context is structurally indistinguishable from guessing.

## Related Claims
[[gatekeeper-filters-toward-inclusion-under-uncertainty]], [[engagement-bait-detection-requires-substance-check]]
