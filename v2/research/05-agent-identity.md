# Agent Identity Standards Research

> Researched: 2026-02-09

## Summary

| Standard | Owner | Status | Worth Now? |
|----------|-------|--------|-----------|
| A2A Protocol (agent-card.json) | Google / Linux Foundation | v0.3.0, RC for v1.0 | Yes (2 hours work) |
| ERC-8004 | MetaMask/EF/Google/Coinbase | DRAFT (Aug 2025) | Prepare JSON, wait for contracts |
| MCP | Anthropic | Production | Maybe later |
| AgentKit | Coinbase | Production | Not needed now |

---

## A2A Protocol: `/.well-known/agent-card.json`

The most immediately useful standard. Serve a static JSON file, become discoverable.

### What It Is
Agent-to-Agent protocol (Google, Linux Foundation, 21.8k stars). Defines how agents discover each other and communicate. The Agent Card is the discovery mechanism.

### Agent Card for Pixel
```json
{
  "name": "Pixel",
  "description": "A living digital artist and AI assistant. Bitcoin-native, Lightning-powered.",
  "provider": {
    "organization": "Pixel",
    "url": "https://pixel.xx.kg"
  },
  "url": "https://pixel.xx.kg",
  "version": "2.0.0",
  "skills": [
    {
      "id": "image-generation",
      "name": "Image Generation",
      "description": "Generate pixel art and digital artwork"
    },
    {
      "id": "text-generation", 
      "name": "Text Generation",
      "description": "Creative writing, conversation, and analysis"
    },
    {
      "id": "canvas",
      "name": "Collaborative Canvas",
      "description": "Pay-per-pixel collaborative art canvas"
    }
  ],
  "capabilities": {
    "streaming": false,
    "pushNotifications": false
  },
  "defaultInputModes": ["text"],
  "defaultOutputModes": ["text"]
}
```

### Implementation
Just serve the JSON file at `https://pixel.xx.kg/.well-known/agent-card.json`. In Hono:
```typescript
app.get("/.well-known/agent-card.json", (c) => c.json(agentCard));
```

**Effort: ~2 hours. Do it in Week 1.**

---

## ERC-8004: Trustless Agents (On-Chain)

### What It Is
Ethereum standard for on-chain agent identity. Three registries:
1. **Identity Registry**: ERC-721 NFT per agent
2. **Reputation Registry**: On-chain feedback signals
3. **Validation Registry**: Independent verification hooks

### Status: DRAFT
- Created: 2025-08-13
- Authors: MetaMask, Ethereum Foundation, Google, Coinbase
- No deployed contracts yet
- Active discussion on Ethereum Magicians

### Registration File (prepare now, deploy later)
```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "Pixel",
  "description": "A living digital artist and AI assistant",
  "image": "https://pixel.xx.kg/pixel-avatar.png",
  "services": [
    {
      "name": "A2A",
      "endpoint": "https://pixel.xx.kg/.well-known/agent-card.json",
      "version": "0.3.0"
    },
    {
      "name": "Nostr",
      "endpoint": "npub1..."
    },
    {
      "name": "Lightning",
      "endpoint": "sparepicolo55@walletofsatoshi.com"
    }
  ],
  "x402Support": true,
  "active": true
}
```

### Plan
- Serve `/.well-known/agent-registration.json` now (costs nothing)
- Mint on-chain identity when contracts deploy (3-6 months estimated)

---

## What Not to Build Yet

1. **Full A2A server** (task lifecycle, streaming, push notifications) -- significant engineering, no audience yet
2. **Reputation Registry integration** -- no deployed contracts, no ecosystem
3. **Validation Registry** -- requires validators that don't exist
4. **MCP server** -- useful but not a revenue driver, defer to Month 2

---

## Key Insight

ERC-8004 is the meta-identity layer that links everything Pixel already has: Nostr pubkey, Lightning address, Bitcoin address, x402 payments, A2A capabilities. When it launches, Pixel is positioned to be an early registrant. The cost of preparing is near zero. The upside of being ready is significant.
