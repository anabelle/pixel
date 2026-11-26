---
description: Long structured document generations repeatedly cut off mid-sentence, leaving required sections unwritten and incomplete instructions running.
kind: claim
topics: [[technical]]
---

# long-form-output-truncation

Across three observations (pixel-forge character documents on 09-27 and 10-04, and nostr-judge rejection criteria on 10-03), extended structured outputs were truncated mid-sentence. When the truncated content is itself instructions (as with rejection criteria), the failure compounds downstream with incomplete rules. Long structured generations should include length budgeting, prioritized section ordering, or chunked delivery so critical sections complete.

## Related Claims
[[structured-output-requires-completion-verification]], [[instructions-are-invalid-if-truncated]]
