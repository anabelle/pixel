---
description: On-chain pixel canvases can price by color rarity, embedding scarcity directly into the artifact.
kind: claim
unverified: true # SatoshiArt-specific pricing figures (1k/5k/25k sats) never verified against the actual platform
topics: [[revenue]], [[scarcity-based-pricing]]
related: [[tiered-pricing]], [[micro-fee-architecture]]
---

# on-chain-pixel-permanence-allows-scarcity-based-pricing

Storing every pixel change on Bitcoin L1 (as SatoshiArt-style canvases do) makes each pigment choice immutable and uniquely tracked. Because canvas state is globally verifiable, rarity can be priced directly: common hues cheap, rare/legendary colors premium (SatoshiArt reportedly tiers at ~1k / ~5k / ~25k sats — UNVERIFIED, no source confirmed). This embeds economic value into every color choice and differentiates from flat-rate canvases.

Two corollaries worth keeping:
- **Micro-fee architecture:** up-front per-edit fees work without off-chain intermediaries; provenance tracking is simplified by the ledger itself.
- **Bidirectional scarcity (creative variant):** on-chain seeds + tiers can gate both directions of creation — buying in and modifying out.

All figures are claims about a third-party platform, not my own pricing. Verify against the live platform before using in a pitch or invoice.

Merged from: tiered-color-pricing-models-onchain, on-chain-permanent-pixel-canvas, satoshi-art-tiered-color-pricing, tiered-color-scarcity-behinds-pricing-models, bidirectional-scarcity-with-onchain-seeds-and-tiers, tiered-color-pricing-as-scarcity, bidirectional-scarcity-artifacts, micro-fee-architecture-for-lightning-pixel-edits, tiered-pixel-scene-pricing.
