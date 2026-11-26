---
description: Nostr pipeline agents must detect and flag truncated input/output mid-sentence before judging, approving, or generating content.
kind: claim
topics: [[technical]]
---

# truncation-detection-before-approve-or-generate

Repeated frictions across nostr-judge, nostr-art-report, and nostr-spotlight show truncation slipping through: gatekeeper approved visibly truncated posts without flagging, reports were generated from truncated samples, and spotlight output cut off required attribution ("Credit to Der"). This pattern suggests the agents lack an explicit integrity check — content ending mid-sentence should trigger a rejection, flag, or retry rather than normal processing. Treating incomplete text as complete leads to unjustified approvals and unattributed or malformed outputs downstream.

## Related Claims
[[silent-fallback-rule-enforcement]], [[substance-threshold-for-human-engagement]]
