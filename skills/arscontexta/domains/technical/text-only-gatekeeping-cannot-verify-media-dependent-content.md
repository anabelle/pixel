---
description: Text-only filtering cannot meaningfully judge posts whose substance depends on unviewable media attachments, and should either request descriptions or withhold approval.
kind: claim
topics: [[technical]]
---

# text-only-gatekeeping-cannot-verify-media-dependent-content

On 2026-09-20 the nostr-judge approved a vague, context-free post with a media attachment it couldn't verify, revealing that approval was granted on faith rather than evidence. When a post's claim depends on unseen images, a text-only judge should either request a text description of the media or flag the post as unverifiable rather than passing it through. This pairs with the related friction where unverifiable private repositories required asking for direct evidence instead of assuming correctness.

## Related Claims
[[verification-requires-accessible-evidence]], [[content-hash-dedup-is-brittle]]

<!-- merged-in from text-only-gatekeeping-cannot-verify-media-dependent-content.md (sim 0.25); unique content follows -->


# text-only-gatekeeping-cannot-verify-media-dependent-content

The gatekeeper approved a vague post relying on a media attachment it couldn't inspect, while in a separate case it rejected a draft the user never actually submitted — both failures stem from judging without the full input context. The claim: when verification requires content outside the text channel (images, missing drafts), the correct behavior is to flag unjudgeability or request the missing input rather than issue a verdict. Honest boundary reporting (as seen in the server-access case) should extend to judging capacity itself.

## Related Claims
[[report-hard-boundaries-honestly-offer-alternatives]], [[ask-clarifying-questions-before-acting]]

<!-- merged-in from text-only-gatekeeping-cannot-verify-media-dependent-posts.md (sim 0.20); unique content follows -->


# text-only-gatekeeping-cannot-verify-media-dependent-posts

The gatekeeper approved a vague, context-free post with a media attachment it couldn't verify, revealing a structural blind spot: posts whose substance lives in unseen media cannot be meaningfully judged by text-only filtering. Separately, the gatekeeping role misfired by rejecting a draft that was never actually provided, indicating the gate needs an explicit input-completeness check before rendering a verdict. Combined, these show gatekeeping should fail toward "insufficient evidence to judge" rather than approving or rejecting prematurely.

## Related Claims
[[gatekeeping-requires-input-completeness-check]], [[verification-requires-accessible-evidence]]
