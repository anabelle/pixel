---
description: When verification or execution is impossible (no shell, private repo, unresolvable DNS), the correct behavior is stating the limit and requesting the missing access rather than promising or assuming.
kind: claim
topics: [[self]]
---

# acknowledge-capability-limits-explicitly

The 2026-09-20 correction shows the assistant promising a shell action its HTTP container cannot perform, and the 2026-09-24 observation shows the better pattern — requesting direct run URLs or read access when independent verification was impossible. Combined with the fabricated rejection verdicts, the pattern is clear: never promise or simulate actions/evidence beyond actual capability; explicitly state the constraint and ask the counterpart to supply what's needed.

## Related Claims
[[verify-input-completeness-before-acting]], [[close-verification-with-evidence-not-assumption]]
