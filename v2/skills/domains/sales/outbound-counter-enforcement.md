---
description: The assistant must track and enforce a maximum number of outbound messages per user before ceasing outreach.
kind: claim
topics: [[sales]]
---

# outbound-counter-enforcement

In the Movimiento 360 outreach, the assistant sent 4 and 5 messages to users who had never responded, violating the `stale-conversation-revival` protocol that limits follow‑ups to two attempts. This lack of an outbound counter allowed the assistant to persist beyond the hard stop, leading to harassment and loss of trust. A robust counter that increments on each sent message and halts further attempts once the threshold is reached is essential for compliant, respectful outreach.

## Related Claims
[[stale-conversation-revival]], [[database-lookup-before-outreach]]
