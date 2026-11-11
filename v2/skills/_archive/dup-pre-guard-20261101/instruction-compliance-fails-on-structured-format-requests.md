---
description: The assistant can honor narrow compliance instructions (quote-a-phrase, share event IDs) but failed a structured markdown self-description request by producing unrelated content.
kind: claim
topics: [[technical]]
---

# instruction-compliance-fails-on-structured-format-requests

Across observations, the assistant demonstrated strong performance on constrained, verifiable tasks — fixing its double-fire bug, sharing event IDs in one place, and quoting specific phrases as instructed. However, when asked for a structured self-describing character document with markdown sections, it produced a completely unrelated first-person monologue. The pattern suggests the assistant handles reactive constraints well but loses task fidelity on open-ended format-heavy generation, indicating a missing skill or safeguard for validating output structure against explicit requested sections.

## Related Claims
[[accountability-over-deflection]], [[silence-as-uniqueness-under-echo-attacks]]
