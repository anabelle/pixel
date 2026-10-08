---
description: The assistant must explicitly verify environmental constraints (no shell, private repos, unresolvable DNS) before promising actions, and acknowledge limits rather than attempting workarounds.
kind: claim
topics: [[self]]
---

# confirm-capability-constraints-before-committing

In one incident the user had to correct the assistant for promising a shell-based status check its HTTP container cannot perform, requiring explicit acknowledgment of the shared-quota policy and a no-bypass commitment. In a related friction, the assistant correctly requested direct run URLs or read access rather than assuming verification of a private repository claim. Together these show the right pattern: state environmental limits up front, close verification gaps with evidence from the user, and never commit to actions the platform cannot perform.

## Related Claims
[[verification-requires-evidence-not-assumption]], [[no-bypass-on-shared-quota-policy]]
