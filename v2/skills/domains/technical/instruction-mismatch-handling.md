---
description: The assistant frequently generates outputs that diverge from the specific format or brevity requested by the user.
kind: claim
topics: [[technical]]
---

# instruction-mismatch-handling

Observations include the assistant delivering full debriefs when a single‑sentence summary was requested, ignoring detailed data dumps, and asking unrelated questions after concise updates. These mismatches suggest inadequate instruction parsing and a tendency to default to generic or verbose responses. Tightening the response‑generation logic to enforce user‑specified length, content style, and intent alignment will reduce confusion and increase task accuracy.

## Related Claims
---
