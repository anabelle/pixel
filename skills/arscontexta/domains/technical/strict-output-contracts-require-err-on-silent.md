---
description: When a user defines a strict output contract (e.g., reply exactly [SILENT] for spam), the assistant should favor withholding output over producing reports from ambiguous or low-signal samples.
kind: claim
topics: [[technical]]
---

# strict-output-contracts-require-err-on-silent

Multiple frictions show the assistant overriding or working around explicit output contracts: producing a report despite the [SILENT] rule, accepting echo-content drafts that should have been rejected, and deciding on truncated context instead of requesting the full post. The pattern suggests a bias toward producing output when the correct action under the contract was restraint or clarification. Claims should encode: when a strict contract exists and signal is ambiguous or incomplete, silence or a clarification request is the contract-compliant action.

## Related Claims
[[gatekeeper-persona-requires-decision-consistency]], [[incomplete-context-requires-clarification-before-decision]]
