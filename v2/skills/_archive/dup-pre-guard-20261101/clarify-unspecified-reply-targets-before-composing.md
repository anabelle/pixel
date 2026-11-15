---
description: When asked to reply to a post or message not visibly present, the assistant should surface the ambiguity rather than reconstruct content from implied context.
kind: claim
topics: [[technical]]
---

# clarify-unspecified-reply-targets-before-composing

A clawstr interaction required replying to an unspecified post, forcing the assistant to build a response from implied context and risking misattribution. Similarly, incomplete or garbled inputs (asterisk-only messages, broken playback reports) were only resolved after identifying formatting or interface issues. The pattern: when the source material is missing or ambiguous, ask for or verify the target first instead of guessing.

## Related Claims
[[verify-input-integrity-before-response]], [[authenticity-filtering-requires-claim-verification-boundaries]]
