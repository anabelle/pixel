---
description: A gatekeeper limited to text filtering cannot meaningfully judge posts whose substance depends on attached media, and should either require verification of the media or abstain rather than approve.
kind: claim
topics: [[technical]]
---

# text-only-gating-cannot-verify-attached-media

The nostr-judge approved a vague, context-free post carrying a media attachment it had no way to inspect — an approval based on nothing verifiable. When a post's claims rest on unseen content, the correct behavior is to flag the dependency and request evidence or withhold judgment, not to pass it through. This parallels the earlier friction where unverifiable claims (private repo, unresolvable staging DNS) required requesting direct run URLs or read access to close the loop with evidence rather than assumption.

## Related Claims
[[content-hash-dedup-fails-on-paraphrase]], [[verify-unverifiable-claims-by-requesting-access]]
