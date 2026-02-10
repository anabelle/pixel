# Pi Monorepo Research

> Source: github.com/badlogic/pi-mono (8,790 stars, MIT, v0.52.9)
> Researched: 2026-02-09

## Overview

Pi is an AI agent toolkit by Mario Zechner (badlogic). It's a TypeScript monorepo with 7 packages. Not an "agent framework" like ElizaOS -- it's a set of composable libraries.

## Packages

| Package | NPM | Purpose |
|---------|-----|---------|
| `@mariozechner/pi-ai` | `packages/ai` | Unified multi-provider LLM API (OpenAI, Anthropic, Google, etc.) |
| `@mariozechner/pi-agent-core` | `packages/agent` | Agent runtime with tool calling and state management |
| `@mariozechner/pi-coding-agent` | `packages/coding-agent` | Interactive coding agent CLI (the main product) |
| `@mariozechner/pi-mom` | `packages/mom` | Slack bot that delegates to pi coding agent |
| `@mariozechner/pi-tui` | `packages/tui` | Terminal UI library |
| `@mariozechner/pi-web-ui` | `packages/web-ui` | Web components for AI chat interfaces |
| `@mariozechner/pi-pods` | `packages/pods` | CLI for managing vLLM deployments on GPU pods |

## What We Need

For V2 Pixel, we need `pi-ai` and `pi-agent-core`:

### pi-ai: Unified LLM API
- Supports 18+ providers through a single interface
- No patches needed (unlike ElizaOS's ai-sdk which required 130 lines of Dockerfile perl patches)
- OpenAI, Anthropic, Google, Groq, Together, Fireworks, DeepSeek, Mistral, etc.
- Zero-config provider switching via environment variables

### pi-agent-core: Agent Runtime
- Stateful agent loop with tool calling
- Conversation tree (branching, rewind) -- replaces our 773-line Worker Architecture
- Tool registration system
- State management for multi-turn conversations

### pi-mom: Reference Pattern for Platform Connectors
- Shows how to build a non-CLI agent using pi-agent-core
- Slack bot that delegates messages to the coding agent
- **This is our template for WhatsApp/Telegram/Nostr connectors**
- Pattern: receive message from platform -> feed to agent -> return response to platform

## Architecture Pattern for V2

```
Platform Connector (WhatsApp/Telegram/Nostr/HTTP)
  |
  v
pi-agent-core (conversation management, tool calling, state)
  |
  v
pi-ai (LLM provider, model selection)
  |
  v
Tools (Nostr publishing, image generation, Lightning payments, etc.)
```

Each connector is a thin adapter: ~50-100 lines that translates platform-specific message format into agent-core's input format, and agent-core's output back to the platform.

## Key Technical Details

- **Runtime**: TypeScript, works with Node.js and Bun
- **Build**: npm workspaces monorepo
- **Latest release**: v0.52.9 (Feb 8, 2026)
- **Maintenance**: Very active (2,920 commits, 117 contributors, 151 releases)
- **OSS Vacation**: Issue tracker and PRs reopen Feb 16, 2026

## Dependency Risk Assessment

- **Bus factor**: Primary maintainer is Mario Zechner (badlogic), known for libGDX (22.9k stars). Not a fly-by-night developer.
- **Community**: 8,790 stars, 904 forks, Discord community, 117 contributors
- **License**: MIT (no risk)
- **Stability**: 151 releases suggests rapid iteration. API may change. Keep abstraction layer thin.
- **Mitigation**: pi-ai and pi-agent-core are relatively simple libraries. If abandoned, we could fork or replace with direct LLM API calls + custom agent loop.

## Unknowns (Need Further Research)

- [ ] Exact API surface of pi-agent-core (need to read source code)
- [ ] Memory management patterns (JSONL per-user vs DB-backed)
- [ ] How tree sessions work in practice
- [ ] Whether pi-mom's Slack pattern maps cleanly to WebSocket-based platforms (WhatsApp/Nostr)
- [ ] Resource usage of agent-core in a long-running server process
