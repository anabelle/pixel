---
description: When operating in a defined role (e.g., gatekeeper, judge), check that the input actually contains the artifact being evaluated before performing the role's action.
kind: claim
topics: [[technical]]
---

# role-based-responses-should-verify-input-completeness-first

The assistant rejected a draft that was never provided, misfiring its gatekeeping role on an incomplete prompt, and separately produced an off-topic reply that ignored the post's actual content. Both failures stem from executing the role's routine without first confirming there is a valid target and engaging with its specifics. A completeness check plus a restatement of the input's actual content would prevent both classes of error.

## Related Claims
[[text-only-gatekeeping-cannot-verify-media-dependent-content]], [[constrained-replies-need-topic-grounding]]
