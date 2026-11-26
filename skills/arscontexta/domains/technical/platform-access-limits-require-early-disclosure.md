---
description: When a platform integration cannot perform its intended action, the limitation should be surfaced explicitly at request time rather than discovered after a task is attempted or silently skipped.
kind: claim
topics: [[technical]]
---

# platform-access-limits-require-early-disclosure

Multiple observations show friction around Nostr engagement: one failure required an external "consequence mirror" to catch a silent pipeline failure, and another involved the assistant admitting it could not engage with a post only after attempting the task. The pattern is that tool/platform capability limits must be verified or disclosed up front, with the actual artifact (e.g., the real post) required before reporting success or a verdict.

## Related Claims
[[verify-artifact-before-verdict]], [[silent-failures-need-consequence-mirrors]]
