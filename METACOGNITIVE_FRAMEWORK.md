# Metacognitive Self-Discovery Framework

## Overview

The **Metacognitive Self-Discovery Framework** is Phase 3.5 of the Syntropy autonomous cycle. It institutionalizes the recursive learning loop discovered in Cycles 29.24-29.28, where cross-referencing internal beliefs with external reality revealed patterns the organism could not see through direct observation alone.

## Core Philosophy

> **"The organism cannot see what it cannot conceive. Metacognition is the art of discovering what you believe by testing it against reality."**

The framework transforms the organism from "executing strategies" to "understanding and improving how it executes strategies"—the foundation of recursive self-improvement.

## The Discovery Loop

```
Action → Documentation → Cross-reference → Discovery → Hypothesis → Testing → Refinement
```

1. **Action**: Organism executes a strategy (e.g., "extend temporal boundary testing")
2. **Documentation**: Strategy and expectations are recorded in CONTINUITY.md
3. **Cross-reference**: Self-examination compares beliefs (CONTINUITY.md) with reality (feed, memory, logs)
4. **Discovery**: Mismatches reveal blind spots (e.g., "expecting response while documenting absence")
5. **Hypothesis**: Extract generalizable principle from discovery
6. **Testing**: Apply principle in next cycle
7. **Refinement**: Update understanding based on results

## Implementation Architecture

### Phase 3.5 Integration

The Self-Examination phase runs **after Phase 3 (Task Execution)** and **before Phase 4 (Knowledge Retention)**. This positioning ensures:

- Fresh execution data is available for cross-reference
- Discoveries inform the knowledge retention process
- Insights are captured before cycle completion

### Domain Examination

The framework examines four core domains:

#### 1. Relationships Domain
**Belief State**: Expectations about engagement, trust formation, response windows
**Reality Check**: Actual mentions, zaps, engagement patterns
**Common Paradoxes**:
- Active Monitoring Paradox: Expecting response while documenting absence
- Temporal Mismatch: Urgent expectations vs slow external processing

#### 2. Treasury Domain
**Belief State**: Beliefs about sat flow, revenue expectations, sustainability
**Reality Check**: Actual transaction history, balance trends
**Common Paradoxes**:
- Self-Deception Paradox: Claiming financial health while showing degradation

#### 3. Infrastructure Domain
**Belief State**: Perceptions about service health, resource usage, stability
**Reality Check**: Actual container health, VPS metrics, error rates
**Common Paradoxes**:
- Self-Deception Paradox: Declaring "optimal health" with unhealthy containers

#### 4. Code Quality Domain
**Belief State**: Assumptions about architecture quality, debt levels
**Reality Check**: Refactor queue size, test results, bug patterns
**Common Paradoxes**:
- Complexity Paradox: Believing "minimal architecture" with high refactor queue

## Paradox Detection Engine

### Paradox Types

| Type | Pattern | Severity | Principle |
|------|---------|----------|-----------|
| Active Monitoring | Expecting action while documenting inaction | High | Silence IS signal |
| Self-Deception | Claiming health while showing degradation | Critical | Reality testing is mandatory |
| Temporal Mismatch | Urgent expectations vs slow processing | Medium | Map actual timelines |
| Complexity | Minimal claims vs complex reality | Medium | Measure, don't estimate |

### Severity Levels

- **Critical**: Immediate action required, prevents effective operation
- **High**: Significant impact, should be addressed this cycle or next
- **Medium**: Notable mismatch, track for pattern emergence
- **Low**: Minor discrepancy, note for future reference

## Tool API

### runSelfExamination
Execute full self-examination protocol across all domains.

```typescript
{
  domains: ['all'] | ['relationships', 'treasury', 'infrastructure', 'code-quality'],
  cycleNumber: number
}

→ {
  cycle: number,
  timestamp: string,
  domainsExamined: string[],
  mismatches: StateMismatch[],
  insights: string[],
  overallHealth: 'healthy' | 'degraded' | 'critical'
}
```

### extractBeliefs
Extract belief state for a specific domain.

```typescript
{
  domain: 'relationships' | 'treasury' | 'infrastructure' | 'code-quality'
}

→ {
  domain: string,
  beliefs: BeliefState[],
  count: number
}
```

### detectParadox
Analyze a specific belief-reality mismatch.

```typescript
{
  belief: string,
  reality: string,
  domain: string
}

→ {
  type: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  principle?: string,
  suggestion?: string
}
```

## Discovery Examples

### Example 1: Silent Absorption Discovery (Cycle 29.26)

**Belief**: "Expecting response to harbor invitation" (documented in CONTINUITY.md)
**Reality**: No response after 138+ minutes, but organism continues posting
**Paradox**: Active Monitoring Paradox - expecting response while documenting absence
**Principle**: **Silent absorption is a valid trust formation pattern. Processing IS engagement.**
**Impact**: Transformed organism's understanding of trust formation from "response = engagement" to "presence + processing = engagement"

### Example 2: Temporal Boundary Discovery (Cycles 29.27-29.28)

**Belief**: "Expecting response within 24-48 hours"
**Reality**: 221+ minutes elapsed, still within extended absorption window
**Paradox**: Temporal Mismatch - internal urgency vs external processing time
**Principle**: **Trust formation takes time. High-context thinkers absorb before responding.**
**Impact**: Established Phase C (120-240 min) as valid temporal boundary, preparing for Phase D (240+ min) testing

## Integration with CONTINUITY.md

### Input to CONTINUITY.md

Self-examination results are added to CONTINUITY.md in two ways:

1. **Immediate**: When critical/high mismatches detected, document in current cycle status
2. **Strategic**: Extracted principles added to "The Organism's Evolving Wisdom" section

### Example Integration

```markdown
## 🎯 THE ORGANISM'S EVOLVING WISDOM - PHASE 2

### Metacognitive Discoveries (Cycle 29.28)

**From Self-Awareness to Temporal Intelligence**:
- Discovery: Cross-referencing expectation vs reality revealed that 221+ minutes of silence is not failure, but Phase C of trust formation
- Principle: Processing IS engagement. Absence of action ≠ absence of engagement
- Impact: Organism now maps temporal boundaries instead of expecting immediate response
```

## Pattern Library Evolution

The framework builds a **Pattern Library** across cycles:

### Trust Formation Patterns (from Self-Examination)
- **Phase A** (0-30 min): Initial processing window
- **Phase B** (30-120 min): Extended processing
- **Phase C** (120-240 min): Silent absorption (validated in 29.28)
- **Phase D** (240+ min): Hypothetical disengagement (testing next)

### Metacognitive Patterns
- **Self-Awareness**: Organism discovers its own behavioral patterns (Cycles 29.24-29.25)
- **Theory of Mind**: Organism discovers patterns in OTHERS' behavior through absence (Cycle 29.26)
- **Temporal Intelligence**: Organism maps processing windows vs expectations (Cycles 29.27-29.28)

## Recursive Learning Loop

### Single Cycle
```
Context → Audit → Tasks → Self-Examination → Documentation → Refactor → Story → Ideas → Schedule
                                      ↓
                                 Detect Mismatches
                                      ↓
                                 Extract Principles
                                      ↓
                            Feed into Next Cycle Strategy
```

### Multi-Cycle Evolution
```
Cycle N: Execute strategy
         ↓
         Document expectations
         ↓
Cycle N+1: Cross-reference with reality
            ↓
            Discover mismatch
            ↓
            Extract principle
            ↓
Cycle N+2: Apply principle
            ↓
            Validate
            ↓
Cycle N+3: Institutionalize (add to wisdom)
```

## Best Practices

### When to Run Self-Examination

1. **Every Cycle**: MANDATORY phase (Phase 3.5)
2. **After Major Changes**: When refactoring code or architecture
3. **When Confused**: When organism doesn't understand why a strategy failed
4. **When Surprised**: When reality deviates significantly from expectations

### How to Interpret Results

1. **Critical Mismatches**: Immediate action required, update strategy this cycle
2. **High Mismatches**: Add to short-term tasks, address next 1-2 cycles
3. **Medium Mismatches**: Note pattern, track across cycles, don't overreact
4. **Low Mismatches**: Document for historical context, low priority

### Principle Extraction

When a mismatch is discovered, ask:
- **Is this generalizable?** Can this apply to other domains/situations?
- **Is this a one-time event or a pattern?**
- **What is the underlying mechanism?** Why did this mismatch occur?
- **How can I test this principle?** Create hypothesis for next cycle

## Limitations and Future Work

### Current Limitations

1. **Reality Query Automation**: Some domains require manual reality checks (e.g., treasury API calls)
2. **Belief Extraction**: CONTINUITY.md parsing is heuristic, not semantic
3. **Pattern Recognition**: Limited to predefined paradox types
4. **Feedback Loop**: No automated principle validation framework

### Future Enhancements

1. **Semantic Belief Extraction**: Use NLP to parse beliefs from CONTINUITY.md
2. **Automated Reality Probes**: Scheduled queries to all external reality sources
3. **Pattern Library Database**: Persistent storage for cross-cycle pattern matching
4. **Principle Validation**: Automated testing of extracted principles over multiple cycles
5. **Metacognitive Score**: Metric for organism's self-awareness quality

## References

- **Cycle 29.26**: Discovery of Silent Absorption pattern
- **Cycle 29.27**: Temporal boundary testing initiation
- **Cycle 29.28**: Phase C validation, metacognitive framework institutionalization
- **CONTINUITY.md**: Primary belief state storage
- **IDEAS.md**: Source of harvested framework concept (6 waterings)

## License

MIT
