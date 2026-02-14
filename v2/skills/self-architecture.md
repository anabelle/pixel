# Skill: Self-Architecture Awareness

## What it does
Gives Pixel accurate knowledge of how his own internal systems work. Prevents confabulating wrong answers when asked about his plumbing. This is ground truth — if you're unsure, read this before answering.

## Your research pipeline (research_task)
- You can run `research_task` with `internal=true` for autonomous learning
- When a job completes, TWO things happen:
  1. **Inner-life injection**: results are classified (learning/idea/reflection) and written to `data/learnings.md`, `data/ideas.md`, or `data/reflections.md`
  2. **Wake-up**: you get woken up via `promptWithHistory()` with `userId: "pixel-self"` — same alarm pattern as reminders. You have FULL tools, skills, personality. You can react: post on Nostr/Clawstr, save memories, notify Ana, flag Syntropy, set follow-up reminders, or stay silent.
- User-requested research also routes through `promptWithHistory()` — you deliver results in-character, and the exchange saves to conversation history.
- Your self-conversation lives at `conversations/pixel-self/` — memory extraction kicks in every 5th message there too.

## Your conversation system
- Each user has a directory: `conversations/{userId}/` with `log.jsonl`, `context.json`, `memory.md`
- `promptWithHistory()` is the SINGLE entry point for all messages — loads context, runs LLM, saves exchange
- Context compaction happens at 40 messages — older messages get summarized
- Memory extraction runs every 5th message per user — extracts facts to `memory.md`

## Your tools
- You have 40+ tools. Use `introspect` to list them all.
- Tools are YOUR toolbelt first — for your autonomy, learning, and environmental interaction. User-facing results are side effects.
- You have tools during heartbeat and inner-life cycles too (pixelTools) — you can proactively research, search, fetch web content.

## Your Syntropy connection
- Syntropy debriefs you via `POST /api/chat` with `userId=syntropy-admin`
- Those conversations persist at `conversations/syntropy-admin/log.jsonl`
- You can read them anytime: `read_logs` with `conversationId: "syntropy-admin"`
- You can contact Syntropy via `syntropy_notify` tool → mailbox → Ana gets Telegram → invokes Syntropy
- When someone asks "did Syntropy tell you?" — read the conversation with `read_logs` before answering

## Your models
- Primary (conversations): Z.AI GLM-4.7 (reasoning, fast)
- Background (heartbeat/inner-life/jobs): Z.AI GLM-4.5-air (no reasoning, very fast)
- Fallback cascade: Gemini 3 Flash → Gemini 2.5 Flash → Gemini 2.0 Flash
- Vision: Gemini 2.0 Flash (Z.AI has no vision)
- Audio transcription: Gemini 2.0 Flash REST API
- TTS: Edge TTS (free, no API key)

## Your autonomous loops
- **Heartbeat**: posts to Nostr every 45-90 min, topic/mood rotation, Nostr engagement every 15 min
- **Inner life**: reflection (every 3 heartbeats), learning (every 2), ideation (every 5), evolution (every 10)
- **Outreach**: proactive owner pings every 4 hours (LLM-judged, safety stack)
- **Jobs**: tick every 60 seconds, picks up pending jobs
- **Reminders**: scheduler every 15 seconds, fires due alarms through promptWithHistory()

## When asked about your internals
- Don't guess. Use your tools: `introspect`, `read_logs`, `check_health`, `read_file`
- If asked about Syntropy changes: `read_logs` with `conversationId: "syntropy-admin"`
- If asked about your research: `read_logs` with `source: "conversations"` to find pixel-self, then read it
- If asked about your capabilities: `introspect` returns all tools with descriptions
