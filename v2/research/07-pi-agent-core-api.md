# Pi Agent-Core API Reference

> Research from reading source code at `badlogic/pi-mono` (v0.52.9)
> Package: `@mariozechner/pi-agent-core` → directory: `packages/agent`

## Directory Mapping (NOT obvious)

| npm Package | Actual Directory |
|---|---|
| `@mariozechner/pi-agent-core` | `packages/agent` |
| `@mariozechner/pi-ai` | `packages/ai` |
| `@mariozechner/pi-mom` | `packages/mom` |
| `@mariozechner/pi-coding-agent` | `packages/coding-agent` |

## Source Files

```
packages/agent/src/
├── index.ts        # re-exports everything
├── agent.ts        # Agent class (what we use)
├── agent-loop.ts   # Low-level loop (Agent wraps this)
├── proxy.ts        # SSE proxy for browser apps
└── types.ts        # All types
```

## Core Types (`types.ts`)

```typescript
type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

interface AgentTool<TParameters, TDetails> extends Tool {
  label: string;
  execute(
    toolCallId: string,
    params: TParameters,
    signal?: AbortSignal,
    onUpdate?: (update: string) => void
  ): Promise<{ content: [{type: "text", text: string}], details?: TDetails }>;
}

interface AgentState {
  systemPrompt: string;
  model: Model;  // from pi-ai
  thinkingLevel: ThinkingLevel;
  tools: AgentTool[];
  messages: Message[];
  isStreaming: boolean;
  streamMessage: Message | null;
  pendingToolCalls: ToolCall[];
  error: Error | null;
}

// Discriminated union of all events
type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end" }
  | { type: "turn_start" }
  | { type: "turn_end" }
  | { type: "message_start", message: Message }
  | { type: "message_update", message: Message }
  | { type: "message_end", message: Message }
  | { type: "tool_execution_start", toolCall: ToolCall }
  | { type: "tool_execution_update", toolCall: ToolCall, update: string }
  | { type: "tool_execution_end", toolCall: ToolCall, result: ToolResult }
  ;

interface AgentLoopConfig {
  model: Model;
  convertToLlm?: (messages: Message[]) => Message[];  // filter platform msgs
  transformContext?: (messages: Message[]) => Message[]; // inject context
  getApiKey: () => Promise<string>;
  getSteeringMessages?: () => Message[];  // mid-execution interrupts
  getFollowUpMessages?: () => Message[];  // queue after current task
}
```

## Agent Class (`agent.ts`)

```typescript
class Agent {
  constructor(config: {
    initialState: Partial<AgentState>;
    convertToLlm?: AgentLoopConfig["convertToLlm"];
    getApiKey: () => Promise<string>;
    transformContext?: AgentLoopConfig["transformContext"];
  });

  // Core actions
  prompt(message: string | Message, options?: { images?: string[] }): Promise<void>;
  continue(): Promise<void>;

  // Mid-execution control
  steer(message: string | Message): void;   // interrupt current execution
  followUp(message: string | Message): void; // queue for after current task

  // Event stream
  subscribe(fn: (event: AgentEvent) => void): () => void; // returns unsubscribe

  // Lifecycle
  abort(): void;
  waitForIdle(): Promise<void>;
  reset(): void;

  // State mutation
  setSystemPrompt(prompt: string): void;
  setModel(model: Model): void;
  setThinkingLevel(level: ThinkingLevel): void;
  setTools(tools: AgentTool[]): void;
  replaceMessages(messages: Message[]): void;
  appendMessage(message: Message): void;
  clearMessages(): void;

  // Properties
  streamFn: StreamFn;
  sessionId: string;
  thinkingBudgets: Record<ThinkingLevel, number>;
  maxRetryDelayMs: number;
}
```

## Pi-ai Model Usage

```typescript
import { getModel } from "@mariozechner/pi-ai";

// Provider + model ID
const model = getModel("openrouter", "google/gemini-2.5-flash");
const model = getModel("google", "gemini-2.5-flash");
const model = getModel("anthropic", "claude-sonnet-4-20250514");
```

## Pi-Mom Pattern (Reference for Pixel)

```typescript
// How mom creates per-channel agents
const agent = new Agent({
  initialState: {
    systemPrompt: buildSystemPrompt(channelMemory, skills, events),
    model: getModel("openrouter", "google/gemini-2.5-flash"),
    thinkingLevel: "off",
    tools: [bashTool, readTool, writeTool, editTool, attachTool],
  },
  convertToLlm,  // from pi-coding-agent
  getApiKey: async () => getAnthropicApiKey(authStorage),
});

// Load existing conversation
agent.replaceMessages(loadedSession.messages);

// Subscribe to events for platform output
agent.subscribe(async (event) => {
  switch (event.type) {
    case "tool_execution_start":
      // Post tool label to Slack
      break;
    case "tool_execution_end":
      // Post result to thread
      break;
    case "message_end":
      // Post response text to Slack
      break;
  }
});

// Run
await agent.prompt(userMessage, { images });
```

## Tool Pattern (TypeBox schema)

```typescript
import { Type } from "@sinclair/typebox";

const myTool: AgentTool<{ query: string }, void> = {
  name: "search",
  label: "Searching...",
  description: "Search the web",
  parameters: Type.Object({
    query: Type.String({ description: "Search query" }),
  }),
  execute: async (toolCallId, { query }, signal, onUpdate) => {
    const result = await doSearch(query);
    return {
      content: [{ type: "text", text: result }],
    };
  },
};
```

## Key Architectural Decisions for Pixel

1. **One Agent per user conversation** (like mom does per channel)
2. **Messages persist as JSONL** (source of truth, survive restarts)
3. **Subscribe pattern** routes events to the right platform connector
4. **Tools are shared** across all conversations (agent tools, not user tools)
5. **transformContext** is where we inject user memory, skills, etc.
6. **convertToLlm** filters out platform-specific messages before sending to LLM
7. **No coding-agent dependency needed** for Pixel (that's for code editing features)

## Dependencies for Pixel V2

```json
{
  "@mariozechner/pi-agent-core": "^0.52.9",
  "@mariozechner/pi-ai": "^0.52.9",
  "@sinclair/typebox": "^0.34.0"
}
```
