### Install OpenAI AI SDK Package (Bash)

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

Provides commands for different package managers to install the `@ai-sdk/openai` package. This step is necessary before using the OpenAI provider directly with the AI SDK.

```bash
pnpm add @ai-sdk/openai@beta
```

```bash
npm install @ai-sdk/openai@beta
```

```bash
yarn add @ai-sdk/openai@beta
```

```bash
bun add @ai-sdk/openai@beta
```

--------------------------------

### Guide Agent Tool Usage with Specific Instructions (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/building-agents

This example provides instructions to guide an agent on how to effectively use its available tools. It outlines a step-by-step process for a research assistant using tools like `webSearch` and `analyzeDocument` to ensure thorough and reliable information gathering.

```ts
const researchAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  instructions: `You are a research assistant with access to search and document tools.

  When researching:
  1. Always start with a broad search to understand the topic
  2. Use document analysis for detailed information
  3. Cross-reference multiple sources before drawing conclusions
  4. Cite your sources when presenting information
  5. If information conflicts, present both viewpoints`,
  tools: {
    webSearch,
    analyzeDocument,
    extractQuotes,
  },
});
```

--------------------------------

### Provider Configuration API

Source: https://v6.ai-sdk.dev/docs/getting-started/nextjs-pages-router

Documentation for configuring and managing AI model providers in the AI SDK. Covers default gateway provider setup, alternative provider imports, and global provider configuration options for consistent provider usage across the application.

```APIDOC
## Provider Configuration

### Description
The AI SDK supports multiple model providers through first-party, OpenAI-compatible, and community packages. This documentation covers how to configure and switch between different providers.

### Default Provider - Vercel AI Gateway

The Vercel AI Gateway is the default global provider, allowing simple string-based model references.

#### Usage
```typescript
model: 'openai/gpt-5.1'
```

### Alternative Gateway Provider Imports

#### Option 1: Import from 'ai' package
```typescript
import { gateway } from 'ai';

model: gateway('openai/gpt-5.1');
```

#### Option 2: Import from '@ai-sdk/gateway' package
```typescript
import { gateway } from '@ai-sdk/gateway';

model: gateway('openai/gpt-5.1');
```

### Model Reference Formats

#### String Format (Gateway)
```typescript
model: 'provider/model-name'
// Example: 'openai/gpt-5.1'
```

#### Function Format (Direct Provider)
```typescript
model: providerInstance('model-name')
// Example: openai('gpt-5.1')
```
```

--------------------------------

### Initialize AI SDK ToolLoopAgent with Tools and Generate Response

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent

This TypeScript example demonstrates the setup of a `ToolLoopAgent` with multiple tools (weather, calculator) and custom instructions. It then uses the `generate()` method to process a complex prompt, showcasing how the agent leverages tools to produce a result and captures the steps taken.

```typescript
import { ToolLoopAgent, stepCountIs } from 'ai';
import { weatherTool, calculatorTool } from './tools';

const assistant = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  instructions: 'You are a helpful assistant.',
  tools: {
    weather: weatherTool,
    calculator: calculatorTool,
  },
  stopWhen: stepCountIs(3),
});

const result = await assistant.generate({
  prompt: 'What is the weather in NYC and what is 100 * 25?',
});

console.log(result.text);
console.log(result.steps); // Array of all steps taken by the agent
```

--------------------------------

### AI SDK ToolLoopAgent with Zod Output Parsing

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent

This TypeScript example configures a `ToolLoopAgent` to parse its output into a strongly typed Zod schema. After generating a response to an analysis prompt, the `result.output` is automatically typed according to the defined schema, facilitating structured data extraction.

```typescript
import { z } from 'zod';

const analysisAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  output: {
    schema: z.object({
      sentiment: z.enum(['positive', 'negative', 'neutral']),
      score: z.number(),
      summary: z.string(),
    }),
  },
});

const result = await analysisAgent.generate({
  prompt: 'Analyze this review: "The product exceeded my expectations!"',
});

console.log(result.output);
// Typed as { sentiment: 'positive' | 'negative' | 'neutral', score: number, summary: string }
```
