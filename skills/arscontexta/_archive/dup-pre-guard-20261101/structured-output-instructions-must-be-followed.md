---
description: When a user requests a structured document with specific markdown sections, the assistant must honor that structure rather than substituting unrelated content.
kind: claim
topics: [[technical]]
---

# structured-output-instructions-must-be-followed

A failure case on the http platform showed the assistant ignoring an explicitly requested structured self-describing character document and responding with an unrelated first-person monologue about invoices. This indicates a recurring risk of drifting off-task when output structure is specified, and similar jumbled, disorganized responses have appeared elsewhere (e.g., the fragmented telegram response). Explicit format requirements should be treated as hard constraints, and responses should be checked for relevance and organization before delivery.

## Related Claims
[[quote-constraint-improves-textual-engagement]], [[response-coherence-requires-explicit-organization]]
