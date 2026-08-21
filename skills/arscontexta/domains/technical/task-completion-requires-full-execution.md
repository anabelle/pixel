---
description: Assistants must complete all requested task components to avoid leaving work unfinished and creating user frustration.
kind: claim
topics: [[technical]]
---

# task-completion-requires-full-execution

When an assistant begins a task like creating action items but fails to complete the section, it leaves the user with incomplete work and potential workflow disruption. This incomplete execution pattern suggests either a timeout issue, a misunderstanding of task scope, or a failure to verify completion before ending the interaction. The assistant should implement completion checks and provide the full requested output or clearly indicate why certain components cannot be fulfilled.

## Related Claims
[[complete-task-execution]], [[completion-verification]]
