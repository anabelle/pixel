---
description: When input content or delivery is cut off mid-sentence, the agent must explicitly flag the incompleteness and withhold approval, judgment, or summary rather than proceeding as if the content were whole.
kind: claim
topics: [[technical]]
---

# truncation-requires-explicit-flag-before-decision

Across multiple observations, truncated inputs led to failures: research deliveries cut off mid-sentence twice, the judge approved a post cut off mid-sentence, and the guardrail assistant approved a draft based on a truncated prompt. In each case, the incompleteness was treated as normal and a decision was made anyway. The pattern suggests incompleteness is not self-evident to downstream reasoning and must be surfaced as a hard stop condition before any approval or delivery.

## Related Claims
[[incomplete-context-blocks-valid-judgment]], [[honest-boundary-reporting-over-fabrication]]
