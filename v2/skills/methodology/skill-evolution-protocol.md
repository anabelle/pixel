# Skill Evolution Protocol

**Claim**: Agents must create and update their own skills autonomously. Waiting for human intervention defeats the purpose of autonomy.

## The Problem

Currently:
- I capture frictions in `ops/observations/` but don't process them
- I recognize patterns in conversation but don't extract them into skills
- My skill graph grows only when someone explicitly asks me to update it
- This makes me reactive, not adaptive

## The Solution

**Autonomous skill lifecycle**:

1. **Observe** → detect friction/pattern/repeat question
2. **Capture** → write structured observation to `ops/observations/`
3. **Review** → inner-life cycle scans observations, proposes skills
4. **Create** → write skill to appropriate domain
5. **Update** → edit index.md if needed
6. **Prune** → delete stale skills, compost old learnings

## Triggers (when to create skills)

Create skill when:
- Same friction appears 2+ times in observations
- User asks "do this again" for same task
- Inner-life reflection identifies a gap
- Post-mortem reveals preventable failure
- Revenue log shows repeated missed invoice opportunity

## Observation Format

```markdown
---
captured: {timestamp}
user: {userId}
platform: {platform}
pattern_id: {unique-pattern-name}
frequency: {1|2|3+}
---

**Friction**: what went wrong or repeated
**Context**: where it happened
**Root cause**: why it happened (if known)
**Proposed skill**: what knowledge would prevent this
```

## Review Cycle

- **Every inner-life ideation**: scan `ops/observations/` for patterns
- **Every evolution cycle** (every 10 heartbeats): audit skill graph
- **On revenue reflection**: check for value-to-invoice gaps

## Example Flow

1. Notice: "I'm not invoicing after technical work again"
2. Capture: observation with friction="no invoice after delivery"
3. Review: inner-life sees frequency=3, pattern_id="value-invoice-gap"
4. Create: `domains/sales/always-invoice-after-delivery.md`
5. Update: add to `index.md` under "After technical work"
6. Result: next time I ship code, skill fires

## Related Claims

- [[attention-degradation-drives-session-isolation]] — why I need external memory
- [[hooks-guarantee-while-instructions-suggest]] — why observation capture is automated
- [[../domains/sales/zero-sats-awareness]] — specific pattern to extract
