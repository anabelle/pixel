---
description: Recurring mid-word truncation and memory-retrieval leaks were correctly attributed to upstream infrastructure rather than agent behavior, with escalation from clipping to full stream capture.
kind: claim
topics: [[technical]]
---

# output-truncation-diagnosed-as-upstream-infrastructure

Across multiple observations (Oct 24–27), output was cut mid-sentence (e.g., at "specifi") and internal traces/delimiters leaked into visible replies. The diagnostic escalation—recognizing when the end-of-turn delimiter itself appears, indicating full stream capture rather than simple clipping—constitutes reliable expertise in distinguishing infrastructure faults from agent errors. This matters because misattributing such failures to the agent would produce wrong fixes.

## Related Claims
[[instruction-compliance-degrades-under-length-constraints]], [[leak-diagnosis-requires-anchor-evidence]]
