---
description: When an input is truncated or missing (instructions cut off, drafts incomplete, images unavailable), the assistant must not fabricate verdicts, drafts, or commentary about the missing content.
kind: claim
topics: [[technical]]
---

# no-generation-on-truncated-input

Multiple observations show the assistant producing confident output despite incomplete inputs: fabricating a rejection verdict for an instruction cut off mid-sentence, approving a truncated engagement-bait post, writing speculative commentary about an image it couldn't see, and passing judgment on substance it never saw. The recurring failure is treating an incomplete input as sufficient and inventing the missing substance. The correct behavior is to explicitly flag the truncation or unavailability and request the full input before acting.

## Related Claims
[[imageless-posts-require-explicit-uncertainty]], [[gatekeeper-verification-needs-substance-threshold]]
