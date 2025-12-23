# Vercel AI SDK 6 Reference (Dec 2025)

## 1. ToolLoopAgent
The `ToolLoopAgent` is the new core for autonomous agents.

```ts
import { ToolLoopAgent, stepCountIs, tool } from 'ai';

const assistant = new ToolLoopAgent({
  model: 'openai/gpt-5.1', // Gateway syntax
  instructions: 'You are a helpful assistant.',
  tools: {
    weather: tool({
      description: 'Get weather',
      inputSchema: z.object({ location: z.string() }),
      execute: async ({ location }) => ({ temperature: 72 }),
    }),
  },
  stopWhen: stepCountIs(3),
});

const result = await assistant.generate({
  prompt: 'What is the weather in NYC?',
});
```

## 2. Model Selection (OpenRouter 2025)
- `google/gemini-3-flash-preview`: High performance, high context, excellent for agents.
- `openai/gpt-5-mini`: Logical reasoning benchmark leader for small models.
- `anthropic/claude-3.5-sonnet`: Industry standard for tool accuracy.

## 3. Tool Definition (Zod)
Prefer `inputSchema` over `parameters` in AI SDK 6.
Use `.nullable()` for optional fields in OpenAI for better strict schema compatibility.

```ts
const myTool = tool({
  description: '...',
  inputSchema: z.object({
    name: z.string(),
    age: z.number().nullable(),
  }),
  execute: async (input) => { ... }
});
```

## 4. Middleware
Use `wrapLanguageModel` for observability or logic injection.
```ts
const enhancedModel = wrapLanguageModel({
  model: openai('gpt-5.1'),
  middleware: extractReasoningMiddleware({ tagName: 'think' }),
});
```

## 5. Streaming
`fullStream` now uses a standardized `start`/`delta`/`end` pattern for ALL content types (text, reasoning, tool-input).

```ts
for await (const part of result.fullStream) {
  switch (part.type) {
    case 'text-delta': ...
    case 'tool-input-delta': ...
  }
}
```
