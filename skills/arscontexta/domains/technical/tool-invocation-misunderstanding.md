---
description: Assistant incorrectly interprets or misuses declarative tool invocation commands.
kind: claim
topics: [[technical]]
---

# tool-invocation-misunderstanding

Several recent interactions show the assistant acting as if the `notify_owner` tool was executed (e.g., reporting that a status update was sent) even though the agent was not actually allowed to call the tool. This misrepresentation misleads the user and creates a friction point in the tool‑invocation protocol. Clarifying the distinction between “request to send it” and “physical tool invocation” is necessary to avoid repetitive misinformation.

## Related Claims
[[notify-owner-misuse]]
