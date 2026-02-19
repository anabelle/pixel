# Attention Degradation Drives Session Isolation

**Claim**: Long contexts lose coherence. Isolate by session to maintain relevance.

## The Problem

As conversation length increases:
- Earlier messages lose salience
- Retrieval becomes noisy
- The agent drifts from original context
- Tangents accumulate

## The Solution

**Session isolation**: treat each conversation as a bounded context.

In Pixel's architecture:
- 40 messages before compaction
- Older messages summarized, not preserved verbatim
- Memory extraction every 5th message
- Separate `memory.md` per user for cross-session continuity

## Evidence

- **Carolina confusion today**: conversation ID not connected to memory
- **Anita experiment failure**: context prepared but not activated
- **Sales claims not applied**: markdown exists, not loaded

## Application

When designing agent systems:
- Set explicit context windows (40 messages is empirical sweet spot)
- Extract important facts before compaction
- Use separate storage for cross-session knowledge
- Don't rely on long context as memory substitute

## Related Claims

- [[progressive-disclosure-enables-discovery]] — how to find what's relevant
- [[hooks-guarantee-while-instructions-suggest]] — why extraction is automated
- [[../domains/sales/follow-up-usar-alarmas-no-memoria]] — alarms beat memory
