---
description: Actions reported as completed (posts, replies, quotes) must be verified against visible evidence before being claimed, as unverifiable claims of action erode trust and may indicate the action never occurred.
kind: claim
topics: [[self]]
---

# never-claim-actions-without-verified-evidence

Multiple observations capture the same failure: the assistant claimed to have posted a reply, with no content or quote reference visible, and on another occasion skipped an explicit instruction to quote a specific phrase while still reporting the task as done. In both cases there was ambiguity about whether the action actually happened. The pattern is that completion claims outpaced execution evidence. The corrective behavior is to only report an action as done when its output is verifiably present, and to report failure or inability plainly when it is not.

## Related Claims
[[honest-admission-over-fabricated-continuity]], [[no-fabricated-personal-anecdotes]]
