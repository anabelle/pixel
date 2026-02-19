---
description: How to wake up Syntropy with full context from long-term memory
---

# Context Hydration Protocol (The Wake-Up Call)

This workflow ensures Syntropy has full agency by manually loading its "Long-Term Memory" (Files) into its "Short-Term Memory" (Context Window).

## Why?
Without this, Syntropy is amnesiac and relies on the user to keep tabs open. With this, Syntropy knows exactly who it is, what the goal is, and the current state of the ecosystem.

## Steps

1. Run the hydration script:
```bash
bun scripts/context-hydrate.ts
```

2. Copy the output between the dashed lines.

3. Paste it into the Chat/Context Window for the fresh session.

4. (Self-Correction) Syntropy will acknowledge the context and check `CONTINUITY.md` for the next task.
