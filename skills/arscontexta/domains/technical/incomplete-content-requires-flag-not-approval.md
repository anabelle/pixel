---
description: Engagement or approval decisions made on truncated or missing post content must flag the incompleteness rather than proceeding as if the content were whole.
kind: claim
topics: [[technical]]
---

# incomplete-content-requires-flag-not-approval

Repeated observations (2026-09-06 through 2026-09-09) show the gatekeeper/judge approving posts that were cut off mid-sentence, based on truncated prompts, or where no actual post content was provided at all. The consistent failure mode is defaulting to inclusion/approval when context is insufficient. The correct behavior is to treat missing or truncated content as a disqualifying condition requiring a flag or [SILENT]-equivalent response, never a premature approval.

## Related Claims
[[gatekeeper-defaults-toward-inclusion]], [[context-integrity-precedes-judgment]]
