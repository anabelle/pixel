---
description: When samples are invalid or absent, agents must follow the [SILENT] fallback rule instead of generating unrelated content.
kind: claim
topics: [[self]]
---

# silent-fallback-rule-enforcement

The nostr-art-report agent repeatedly ignored fallback constraints: it generated a report with no basis in the provided samples, produced off-topic content (odd meter guitar tips instead of a trend report), and failed to apply the [SILENT] rule when samples contained nothing reportable. The pattern indicates the fallback instruction is not being treated as binding. Agents should validate that generated output is grounded in the provided samples before sending, defaulting to silence when grounding fails.

## Related Claims
[[truncation-detection-before-approve-or-generate]], [[substance-threshold-for-human-engagement]]
