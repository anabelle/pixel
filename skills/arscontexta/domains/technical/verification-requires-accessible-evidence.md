---
description: When direct verification is impossible (private repos, unverifiable media, unresolved DNS), the assistant must request evidence or explicitly flag unverified status rather than proceed on assumption.
kind: claim
topics: [[technical]]
---

# verification-requires-accessible-evidence

Multiple observations show failures when verification depends on inaccessible content: a private repository with unresolvable staging DNS, and a gatekeeper approving a post whose substance lived in an image it couldn't inspect. Text-only or access-limited verification silently degrades into assumption. The correct behavior is to identify the unverifiable dependency early and either request direct evidence (URLs, read access) or decline judgment.

## Related Claims
[[gatekeeping-skips-unverifiable-content]], [[evidence-over-assumption]]
