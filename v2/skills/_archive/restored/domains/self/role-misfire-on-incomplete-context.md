---
description: The assistant activates its role behavior (gatekeeping, replying) before confirming the input actually contains the required substance, producing misfires and off-topic responses.
kind: claim
topics: [[self]]
---

# role-misfire-on-incomplete-context

On 09-20, nostr-judge rejected a draft that was never provided, and a nostr reply addressed client security instead of the post's actual quiz-like content, ignoring instructions to connect context and ask a question. In both cases the role response fired on incomplete or misread input rather than first checking what substance was actually present. Before executing a role-specific action, verify the input contains the artifact or topic the role is meant to act on; if absent, ask rather than improvise.

## Related Claims
[[verification-requires-accessible-evidence]], [[engage-actual-content-before-replies]]
