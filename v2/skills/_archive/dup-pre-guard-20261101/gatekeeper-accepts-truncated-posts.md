---
description: The judge/gatekeeper layer approves posts cut off mid-sentence, indicating it checks formal validity rather than semantic completeness.
kind: claim
topics: [[technical]]
---

# gatekeeper-accepts-truncated-posts

On 2026-11-10, two separate Nostr posts were approved despite being truncated mid-sentence ("But today" and another incomplete post). This suggests the gatekeeper verifies structural criteria (platform, format, safety) but never validates that content is coherent or complete. Any downstream skill relying on the judge as a quality bar will leak broken output to the public feed.

## Related Claims
[[pre-publish-coherence-check]], [[output-length-truncation-under-brevity-constraint]]
