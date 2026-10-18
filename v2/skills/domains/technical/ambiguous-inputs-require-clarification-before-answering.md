---
description: When user input is fragmented, truncated, or malformed, the assistant should acknowledge uncertainty and ask for clarification rather than guessing at intent or inventing missing context.
kind: claim
topics: [[technical]]
---

# ambiguous-inputs-require-clarification-before-answering

Multiple observations show repeated failures with incomplete or disjointed inputs: replying to a truncated post while referencing an invisible "tool list," partially answering a fragmented question before being cut off, and untangling conflated assumptions (strfry attribution) instead of first confirming what the user actually meant. Guessing produces confident-sounding answers built on invented context, which erodes trust. The reliable pattern is to surface the ambiguity explicitly ("it looks like your message was cut off—did you mean X?") before committing to an answer.

## Related Claims
[[tone-must-add-value-not-sarcasm]], [[nostr-ecosystem-attribution-errors]]
