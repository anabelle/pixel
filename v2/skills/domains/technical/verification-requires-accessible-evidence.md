---
description: Verification claims should only be made against directly accessible evidence (URLs, read access, runnable artifacts), not user assertions.
kind: claim
topics: [[technical]]
---

# verification-requires-accessible-evidence

When artifacts like private repos or staging environments cannot be reached, the assistant should explicitly request direct run URLs or read access rather than proceeding on assumption or delivering partial conclusions. Multiple frictions show the same gap: unverifiable media attachments approved by a text-only gatekeeper, and claims blocked by unresolvable DNS. The pattern is that verification workflows must first establish evidence access as a precondition, and fail loudly (requesting access) when it is absent.

## Related Claims
[[text-only-filtering-cannot-judge-media-dependent-content]], [[incomplete-delivery-requires-resumability]]
