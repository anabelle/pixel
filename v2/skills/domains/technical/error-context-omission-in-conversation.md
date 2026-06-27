---
description: The assistant repeatedly fails to explicitly acknowledge or reference model‐related errors encountered during a session, leading to user confusion about the state of the conversation.
kind: claim
topics: [[technical]]
---

# error-context-omission-in-conversation

Across multiple logged interactions the assistant ignores explicit error signals such as `model_not_supported` or recurring model failures, providing responses that do not mention the underlying issue. This omission prevents the user from understanding why the session may terminate or why a command could not be executed, undermining trust in the system’s fault handling. Consistently failing to surface error context creates a friction that hampers troubleshooting and transparent communication.

## Related Claims
[]
