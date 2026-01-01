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

### Install AI SDK and Zod Dependencies

Source: https://v6.ai-sdk.dev/docs/getting-started/nuxt

These commands install the necessary packages for integrating the AI SDK into your Nuxt.js project. It includes the core `ai` package, the `@ai-sdk/vue` integration for Vue.js, and `zod` for schema validation, typically installing beta versions as specified.

```pnpm
pnpm add ai@beta @ai-sdk/vue@beta zod
```

```npm
npm install ai@beta @ai-sdk/vue@beta zod
```

```yarn
yarn add ai@beta @ai-sdk/vue@beta zod
```

```bun
bun add ai@beta @ai-sdk/vue@beta zod
```

--------------------------------

### Create Next.js Application with pnpm

Source: https://v6.ai-sdk.dev/docs/getting-started/nextjs-pages-router

This command initializes a new Next.js project using pnpm, creating a directory named 'my-ai-app' with a basic application setup. Ensure 'App Router' is not selected during setup.

```shell
pnpm create next-app@latest my-ai-app
```

--------------------------------

### Install AI SDK and DeepSeek Provider for Next.js

Source: https://v6.ai-sdk.dev/docs/guides/r1

This command installs the necessary packages for integrating the AI SDK with DeepSeek R1 and React in a Next.js project. It includes the core AI SDK, the DeepSeek provider, and the AI SDK React hooks.

```bash
pnpm install ai @ai-sdk/deepseek @ai-sdk/react
```

--------------------------------

### Install AI SDK and Development Dependencies

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

Installs the core AI SDK package (`ai`), `zod` for schema definition, and `dotenv` for environment variable management. It also installs development dependencies like `@types/node`, `tsx`, and `typescript` for TypeScript support and execution.

```bash
pnpm add ai@beta zod dotenv
pnpm add -D @types/node tsx typescript
```

--------------------------------

### Navigate into Nuxt.js Project Directory

Source: https://v6.ai-sdk.dev/docs/getting-started/nuxt

After successfully creating the Nuxt.js application, this command changes the current working directory to the newly generated 'my-ai-app' folder. This step is essential before proceeding with dependency installation and further project configuration.

```shell
cd my-ai-app
```

--------------------------------

### Start Expo Development Server

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

Command to launch the Expo development server for the AI chatbot application. After running this command, the application becomes accessible at http://localhost:8081 where users can interact with the AI chatbot interface in real-time.

```bash
pnpm expo
```

--------------------------------

### Provider Registry Setup

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/provider-management

Demonstrates the setup of a provider registry using `createProviderRegistry`. This allows for mixing multiple AI providers and accessing them via simple string IDs. The example shows registering the 'anthropic' provider directly and the 'openai' provider with custom setup, including an API key from environment variables.

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createProviderRegistry } from 'ai';

export const registry = createProviderRegistry({
  // register provider with prefix and default setup:
  anthropic,

  // register provider with prefix and custom setup:
  openai: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }),
});
```

--------------------------------

### Run Svelte AI Chatbot Application

Source: https://v6.ai-sdk.dev/docs/getting-started/svelte

This command starts the development server for your Svelte application, making the chatbot accessible in your web browser. Ensure all dependencies are installed before running this command. The application will typically be available on `http://localhost:5173`.

```bash
pnpm run dev
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

### Using Other Providers

#### OpenAI Provider

**Installation**
```bash
# Using pnpm
pnpm add @ai-sdk/openai@beta

# Using npm
npm install @ai-sdk/openai@beta

# Using yarn
yarn add @ai-sdk/openai@beta

# Using bun
bun add @ai-sdk/openai@beta
```

**Implementation**
```typescript
import { openai } from '@ai-sdk/openai';

model: openai('gpt-5.1');
```

### Provider Types

#### First-Party Providers
- Officially supported by the AI SDK
- Full feature support and compatibility
- Regular updates and maintenance

#### OpenAI-Compatible Providers
- Providers that implement OpenAI's API specification
- Compatible with OpenAI SDK interfaces
- May require additional configuration

#### Community Providers
- Community-maintained provider packages
- Extended provider ecosystem support
- Variable feature support

### Global Provider Configuration

You can configure a default global provider for your entire application, allowing string model references to use your preferred provider everywhere.

#### Benefits
- Consistent provider usage across the application
- Simplified model references
- Easy provider switching
- Centralized configuration management

#### Configuration Approach
Refer to the provider management documentation for detailed global provider configuration instructions.

### Provider Selection Guidelines

#### When to Use Gateway Provider
- Quick prototyping and development
- Access to multiple model providers through single interface
- Simplified provider management
- Built-in by default

#### When to Use Direct Provider
- Need provider-specific features
- Direct API control requirements
- Custom provider configuration
- Specific performance optimizations

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

### Best Practices

1. **Choose the Right Approach**: Select provider management strategy based on application needs
2. **Consistent Usage**: Use the same provider configuration pattern throughout your application
3. **Environment Variables**: Store API keys and provider configurations in environment variables
4. **Provider Documentation**: Refer to specific provider documentation for advanced features
5. **Version Management**: Keep provider packages updated for latest features and fixes

### Provider Package Structure

#### Core Package
- `ai` - Main AI SDK package with gateway provider

#### Provider Packages
- `@ai-sdk/openai` - OpenAI provider
- `@ai-sdk/gateway` - Gateway provider (standalone)
- Additional provider packages as needed

### Migration Between Providers

Switching providers typically requires:
1. Installing the new provider package
2. Updating import statements
3. Modifying model references
4. Updating API key configuration
5. Testing compatibility with existing code

### Related Documentation
- AI SDK Core Settings
- Provider Management Guide
- Model Configuration Options
- Global Provider Configuration
```

--------------------------------

### Start Development Server - Bash

Source: https://v6.ai-sdk.dev/docs/guides/multi-modal-chatbot

Command to start the Next.js development server using pnpm package manager. Launches the application on localhost:3000 for local development and testing.

```bash
pnpm run dev
```

--------------------------------

### Install AI SDK and Schema Validation Dependencies

Source: https://v6.ai-sdk.dev/docs/getting-started/nextjs-pages-router

Installs the core AI SDK package (`ai`), its React hooks (`@ai-sdk/react`), and the `zod` library for schema validation. These packages are essential for building AI-powered applications and defining tool inputs.

```pnpm
pnpm add ai@beta @ai-sdk/react@beta zod@beta
```

```npm
npm install ai@beta @ai-sdk/react@beta zod@beta
```

```yarn
yarn add ai@beta @ai-sdk/react@beta zod@beta
```

```bun
bun add ai@beta @ai-sdk/react@beta zod@beta
```

--------------------------------

### Initial Setup with hasToolCall() and openai Model

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/has-tool-call

Shows the initial setup for using `hasToolCall()` with the OpenAI model. This example imports necessary functions and configures `generateText` to stop when the 'finalAnswer' tool is invoked, demonstrating a typical use case for structured AI responses.

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText, hasToolCall } from 'ai';

const result = await generateText({
  model: openai('gpt-5-mini'),
  tools: {
    weather: weatherTool,
    finalAnswer: finalAnswerTool,
  },
  // Stop when the finalAnswer tool is called
  stopWhen: hasToolCall('finalAnswer'),
});
```

--------------------------------

### Install AI SDK Polyfill Packages

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

Installs necessary polyfill packages like `@ungap/structured-clone` and `@stardazed/streams-text-encoding` which provide `structuredClone`, `TextEncoderStream`, and `TextDecoderStream` for Expo/React Native environments.

```pnpm
pnpm add @ungap/structured-clone @stardazed/streams-text-encoding
```

```npm
npm install @ungap/structured-clone @stardazed/streams-text-encoding
```

```yarn
yarn add @ungap/structured-clone @stardazed/streams-text-encoding
```

```bun
bun add @ungap/structured-clone @stardazed/streams-text-encoding
```

--------------------------------

### Run Node.js AI Chat Application

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

Executes the TypeScript AI chat application using `tsx`, a command-line tool that allows running TypeScript files directly. This command starts the interactive AI agent in your terminal.

```bash
pnpm tsx index.ts
```

--------------------------------

### Copy Example Environment File

Source: https://v6.ai-sdk.dev/docs/guides/rag-chatbot

This command creates a new `.env` file by copying the `.env.example`, which serves as a template for configuring environment variables like `DATABASE_URL` and `OPENAI_API_KEY`.

```bash
cp .env.example .env
```

--------------------------------

### Initialize Node.js Project with pnpm

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

Initializes a new Node.js project by creating a directory, navigating into it, and setting up a `package.json` file using the pnpm package manager. This is the first step in setting up any Node.js project.

```bash
mkdir my-ai-app
cd my-ai-app
pnpm init
```

--------------------------------

### Generate Text with DeepSeek R1 via Groq

Source: https://v6.ai-sdk.dev/docs/guides/r1

Implementation using Groq provider with DeepSeek R1 distilled model and reasoning extraction middleware. Requires @ai-sdk/groq and ai packages.

```typescript
import { groq } from '@ai-sdk/groq';
import {
  generateText,
  wrapLanguageModel,
  extractReasoningMiddleware,
} from 'ai';

// middleware to extract reasoning tokens
const enhancedModel = wrapLanguageModel({
  model: groq('deepseek-r1-distill-llama-70b'),
  middleware: extractReasoningMiddleware({ tagName: 'think' }),
});

const { reasoningText, text } = await generateText({
  model: enhancedModel,
  prompt: 'Explain quantum entanglement.',
});
```

--------------------------------

### Install Project Dependencies with pnpm

Source: https://v6.ai-sdk.dev/docs/guides/rag-chatbot

Run this command to install all necessary project dependencies as defined in the `package.json` using the pnpm package manager.

```bash
pnpm install
```

--------------------------------

### Configure Model with OpenAI Provider (TypeScript)

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

Demonstrates how to import the OpenAI provider and configure a specific OpenAI model directly, allowing for direct integration without relying on the Vercel AI Gateway.

```typescript
import { openai } from '@ai-sdk/openai';

model: openai('gpt-5.1');
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

### Example of Running a Specific AI SDK v5 Codemod

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This provides a concrete example of running a particular v5 codemod, `rename-format-stream-part`, on the `src/` directory. This is useful for applying a specific fix or transformation to a designated part of your project.

```sh
npx @ai-sdk/codemod v5/rename-format-stream-part src/
```

--------------------------------

### Install AI SDK 6 Beta Packages

Source: https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta

This command installs the AI SDK 6 Beta, along with its OpenAI and React packages, using npm. It's important to note that APIs might change during the beta phase, so pinning to specific versions is recommended to avoid unexpected breaking changes in patch releases.

```bash
npm install ai@beta @ai-sdk/openai@beta @ai-sdk/react@beta
```

--------------------------------

### Format LLM Prompt with AI SDK Documentation

Source: https://v6.ai-sdk.dev/docs/index

This example demonstrates a structured prompt format for querying a Large Language Model (LLM) with specific documentation content. It requires pasting documentation into the "{paste documentation here}" section and formulating a question within "{your question}" to guide the LLM's response based on the provided text.

```text
Documentation:
{paste documentation here}
---
Based on the above documentation, answer the following:
{your question}

```

--------------------------------

### Generate Image with AI SDK and OpenAI DALL-E 3

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/image-generation

This example demonstrates how to use the `generateImage` function from the AI SDK to create an image using the OpenAI DALL-E 3 model with a given prompt. It shows the basic setup for importing the function and calling it asynchronously.

```tsx
import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Santa Claus driving a Cadillac',
});
```

--------------------------------

### Generate Text with DeepSeek R1 Model

Source: https://v6.ai-sdk.dev/docs/guides/r1

Basic implementation to generate text and reasoning using DeepSeek R1 model directly with the AI SDK. Requires @ai-sdk/deepseek and ai packages.

```typescript
import { deepseek } from '@ai-sdk/deepseek';
import { generateText } from 'ai';

const { reasoningText, text } = await generateText({
  model: deepseek('deepseek-reasoner'),
  prompt: 'Explain quantum entanglement.',
});
```

--------------------------------

### Install AI SDK and OpenAI Provider Dependencies

Source: https://v6.ai-sdk.dev/docs/guides/multi-modal-chatbot

Installs the core `ai` package (AI SDK), `@ai-sdk/react` for React integration, and `@ai-sdk/openai` (the OpenAI provider) into your project using `pnpm`. These are essential for interacting with large language models through the AI SDK.

```bash
pnpm add ai @ai-sdk/react @ai-sdk/openai
```

--------------------------------

### Create Basic ToolLoopAgent

Source: https://v6.ai-sdk.dev/docs/agents/building-agents

Instantiate a ToolLoopAgent with basic model configuration and system instructions. Provides foundation for agent setup.

```TypeScript
import { ToolLoopAgent } from 'ai';

const myAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  instructions: 'You are a helpful assistant.',
  tools: {
    // Your tools here
  },
});
```

--------------------------------

### Create .env File for API Key

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

Creates an empty `.env` file in the project's root directory. This file is used to store sensitive environment variables, such as API keys, securely and outside of version control.

```bash
touch .env
```

--------------------------------

### Initialize Nuxt.js Application with pnpm

Source: https://v6.ai-sdk.dev/docs/getting-started/nuxt

This command utilizes the pnpm package manager to scaffold a new Nuxt.js project. It creates a directory named 'my-ai-app' and sets up the fundamental project structure required for a Nuxt application.

```shell
pnpm create nuxt my-ai-app
```

--------------------------------

### Generate Text with DeepSeek R1 via Fireworks

Source: https://v6.ai-sdk.dev/docs/guides/r1

Implementation using Fireworks provider with DeepSeek R1 model and reasoning extraction middleware. Requires @ai-sdk/fireworks and ai packages.

```typescript
import { fireworks } from '@ai-sdk/fireworks';
import {
  generateText,
  wrapLanguageModel,
  extractReasoningMiddleware,
} from 'ai';

// middleware to extract reasoning tokens
const enhancedModel = wrapLanguageModel({
  model: fireworks('accounts/fireworks/models/deepseek-r1'),
  middleware: extractReasoningMiddleware({ tagName: 'think' }),
});

const { reasoningText, text } = await generateText({
  model: enhancedModel,
  prompt: 'Explain quantum entanglement.',
});
```

--------------------------------

### Define System Messages for AI Model Behavior (JavaScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

This JavaScript example demonstrates how to set a system message using the AI SDK's `generateText` function to guide the AI model's behavior. By including a message with `role: 'system'` before user messages, you can provide initial instructions or context, influencing how the model responds to subsequent user input. The example sets a travel planning persona for the assistant.

```javascript
const result = await generateText({
  model: 'openai/gpt-4.1',
  messages: [
    { role: 'system', content: 'You help planning travel itineraries.' },
    {
      role: 'user',
      content:
        'I am planning a trip to Berlin for 3 days. Please suggest the best tourist activities for me to do.',
    },
  ],
});
```

--------------------------------

### Usage Example: Applying default settings with streamText - TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/default-settings-middleware

Illustrates a comprehensive usage example of defaultSettingsMiddleware. It shows how to wrap a language model with default settings and then use it with the streamText function, demonstrating how explicit parameters override defaults.

```typescript
import { streamText } from 'ai';
import { wrapLanguageModel } from 'ai';
import { defaultSettingsMiddleware } from 'ai';
import { openai } from 'ai';

// Create a model with default settings
const modelWithDefaults = wrapLanguageModel({
  model: openai.ChatTextGenerator({ model: 'gpt-4' }),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 0.5,
      maxOutputTokens: 800,
      providerMetadata: {
        openai: {
          tags: ['production'],
        },
      },
    },
  }),
});

// Use the model - default settings will be applied
const result = await streamText({
  model: modelWithDefaults,
  prompt: 'Your prompt here',
  // These parameters will override the defaults
  temperature: 0.8,
});
```

--------------------------------

### Log AI agent tool calls and results using ai SDK (TypeScript)

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

This snippet extends the previous example by adding console logs for the agent's tool calls and their results. After streaming the text response, it asynchronously retrieves and prints 'result.toolCalls' and 'result.toolResults'. This helps in debugging and understanding when and how the AI agent decides to invoke a tool.

```typescript
import { ModelMessage, streamText, tool } from 'ai';
import 'dotenv/config';
import { z } from 'zod';
import * as readline from 'node:readline/promises';

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: ModelMessage[] = [];

async function main() {
  while (true) {
    const userInput = await terminal.question('You: ');

    messages.push({ role: 'user', content: userInput });

    const result = streamText({
      model: 'openai/gpt-5.1',
      messages,
      tools: {
        weather: tool({
          description: 'Get the weather in a location (fahrenheit)',
          inputSchema: z.object({
            location: z
              .string()
              .describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => {
            const temperature = Math.round(Math.random() * (90 - 32) + 32);
            return {
              location,
              temperature,
            };
          },
        }),
      },
    });

    let fullResponse = '';
    process.stdout.write('\nAssistant: ');
    for await (const delta of result.textStream) {
      fullResponse += delta;
      process.stdout.write(delta);
    }
    process.stdout.write('\n\n');

    console.log(await result.toolCalls);
    console.log(await result.toolResults);
    messages.push({ role: 'assistant', content: fullResponse });
  }
}

main().catch(console.error);
```

--------------------------------

### Create .env.local File for Environment Variables

Source: https://v6.ai-sdk.dev/docs/getting-started/nextjs-pages-router

This command creates an empty `.env.local` file in the project root. This file is used to store sensitive environment variables, such as API keys, which are not committed to version control.

```shell
touch .env.local
```

--------------------------------

### Configure Vercel AI Gateway API Key

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

Adds the Vercel AI Gateway API key to the `.env` file. This key is essential for authenticating your application with the Vercel AI Gateway service, enabling access to AI models.

```env
AI_GATEWAY_API_KEY=xxxxxxxxx
```

--------------------------------

### Install a Ready-Made AI SDK Tool Package

Source: https://v6.ai-sdk.dev/docs/foundations/tools

To utilize pre-built tools, install the desired tool package as you would any other npm library. This command adds 'some-tool-package' to your project's dependencies, making its exported tools available for use with AI SDK functions.

```bash
pnpm add some-tool-package
```

--------------------------------

### Example: Logging a meal with AI SDK

Source: https://v6.ai-sdk.dev/docs/advanced/multistep-interfaces

Demonstrates a simple interaction where a user logs a meal. The AI SDK processes the request, identifies the 'log_meal' tool, and generates the corresponding tool call with parameters extracted from the user's input. This showcases basic tool usage and output.

```text
User: Log a chicken shawarma for lunch.
Tool: log_meal("chicken shawarma", "250g", "12:00 PM")
Model: Chicken shawarma has been logged for lunch.
```

--------------------------------

### Node.js HTTP Server Example with `streamToResponse`

Source: https://v6.ai-sdk.dev/docs/reference/stream-helpers/stream-to-response

This example demonstrates using `streamToResponse` to pipe a streaming AI response to a Node.js HTTP server. It initializes an AI stream, appends data, and forwards it to the `ServerResponse` object, handling completion and closing the data stream.

```typescript
import { openai } from '@ai-sdk/openai';
import { StreamData, streamText, streamToResponse } from 'ai';
import { createServer } from 'http';

createServer(async (req, res) => {
  const result = streamText({
    model: openai('gpt-4.1'),
    prompt: 'What is the weather in San Francisco?',
  });

  // use stream data
  const data = new StreamData();

  data.append('initialized call');

  streamToResponse(
    result.toAIStream({
      onFinal() {
        data.append('call completed');
        data.close();
      },
    }),
    res,
    {},
    data,
  );
}).listen(8080);
```

--------------------------------

### createIdGenerator() - Function Documentation

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-id-generator

Documentation for the createIdGenerator() function, including its parameters, return value, and usage examples.

```APIDOC
## `createIdGenerator()`

Creates a customizable ID generator function. You can configure the alphabet, prefix, separator, and default size of the generated IDs.

### Description

This function returns a new function that generates unique IDs based on the provided configuration options. It allows for customization of the ID's components, such as a prefix, separator, character set (alphabet), and the length of the random part.

### Method

`createIdGenerator(options?: CreateIdGeneratorOptions)`

### Parameters

#### Path Parameters

None

#### Query Parameters

None

#### Request Body

- **options** (object) - Optional. Configuration object for the ID generator.
  - **options.alphabet** (string) - Optional. The characters to use for generating the random part of the ID. Defaults to alphanumeric characters (0-9, A-Z, a-z).
  - **options.prefix** (string) - Optional. A string to prepend to all generated IDs. Defaults to none.
  - **options.separator** (string) - Optional. The character(s) to use between the prefix and the random part. Defaults to "-".
  - **options.size** (number) - Optional. The default length of the random part of the ID. Defaults to 16.

### Request Example

```javascript
import { createIdGenerator } from 'ai';

const generateCustomId = createIdGenerator({
  prefix: 'user',
  separator: '_',
  size: 8
});

const id = generateCustomId(); // Example: "user_1a2b3c4d"
```

### Response

#### Success Response (200)

- **Function** - Returns a function that generates IDs based on the configured options.

#### Response Example

```javascript
// The returned function signature is:
// () => string

const generatedId = createIdGenerator({ prefix: 'order' })();
console.log(generatedId); // Example output: "order_abcdef1234567890"
```

### Notes

- The generator uses non-secure random generation and should not be used for security-critical purposes.
- The separator character must not be part of the alphabet to ensure reliable prefix checking.
```

--------------------------------

### Example: Hono/Express Route Handler with `pipeAgentUIStreamToResponse`

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/pipe-agent-ui-stream-to-response

Illustrates how to integrate `pipeAgentUIStreamToResponse` into a route handler for frameworks like Hono or Express. This example shows streaming responses from an `openaiWebSearchAgent`.

```typescript
import { pipeAgentUIStreamToResponse } from 'ai';
import { openaiWebSearchAgent } from './openai-web-search-agent';

// Hono/Express handler signature
app.post('/chat', async (req, res) => {
  const { messages } = await getJsonBody(req);

  await pipeAgentUIStreamToResponse({
    response: res,
    agent: openaiWebSearchAgent,
    messages,
    // status: 200,
    // headers: { 'X-Custom': 'foo' },
    // ...additional streaming options
  });
});
```

--------------------------------

### Configure Default AI Gateway Model (TypeScript)

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

Illustrates the concise method to specify a model using a simple string, which defaults to the Vercel AI Gateway when it's set as the global provider in the AI SDK.

```typescript
model: 'openai/gpt-5.1';
```

--------------------------------

### Define Detailed Behavioral Instructions for an Agent (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/building-agents

This example illustrates how to provide specific, multi-line guidelines for an agent's behavior and decision-making process. It outlines a structured approach for a code review agent, covering priorities like security, performance, and feedback style.

```ts
const codeReviewAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  instructions: `You are a senior software engineer conducting code reviews.

  Your approach:
  - Focus on security vulnerabilities first
  - Identify performance bottlenecks
  - Suggest improvements for readability and maintainability
  - Be constructive and educational in your feedback
  - Always explain why something is an issue and how to fix it`,
});
```

--------------------------------

### Explicitly Use Vercel AI Gateway Provider (TypeScript)

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

Shows two equivalent ways to explicitly import and use the Vercel AI Gateway provider for model configuration. This provides clarity and ensures the gateway is used, even if not set globally.

```typescript
// Option 1: Import from 'ai' package (included by default)
import { gateway } from 'ai';
model: gateway('openai/gpt-5.1');
```

```typescript
// Option 2: Install and import from '@ai-sdk/gateway' package
import { gateway } from '@ai-sdk/gateway';
model: gateway('openai/gpt-5.1');
```

--------------------------------

### Prompt AI SDK 5 Migration with MCP Server

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This prompt string is used to initiate the AI SDK 5 migration process when leveraging the configured MCP server. It instructs the coding agent to start the migration and first create a checklist.

```plaintext
Please migrate this project to AI SDK 5 using the ai-sdk-5-migration mcp server. Start by creating a checklist.
```

--------------------------------

### Generate text with a system prompt and a user prompt (AI SDK)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

Shows how to use a `system` prompt to provide initial, guiding instructions to the LLM, in conjunction with a user `prompt`. This helps constrain and direct the model's behavior and responses, as demonstrated by making the model act as a travel planner.

```javascript
const result = await generateText({
  model: 'openai/gpt-4.1',
  system:
    `You help planning travel itineraries. ` +
    `Respond to the users' request with a list ` +
    `of the best stops to make in their destination.`,
  prompt:
    `I am planning a trip to ${destination} for ${lengthOfStay} days. ` +
    `Please suggest the best tourist activities for me to do.`,
});
```

--------------------------------

### List MCP Resource Templates (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

This example shows how to list all available resource templates from the MCP server. Resource templates define dynamic URI patterns for flexible data queries.

```typescript
const templates = await mcpClient.listResourceTemplates();
```

--------------------------------

### Setting Temperature for Deterministic Tool Calls and Object Generation

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompt-engineering

This example shows how to set the `temperature` parameter to `0` for AI model calls, which is recommended for ensuring deterministic and consistent results. This is crucial for precise tool calls and generating data that adheres to specific formats or schemas.

```typescript
const result = await generateText({
  model: openai('gpt-5-mini'),
  temperature: 0, // Recommended for tool calls
  tools: {
    myTool: tool({
      description: 'Execute a command',
      inputSchema: z.object({
        command: z.string(),
      }),
    }),
  },
  prompt: 'Execute the ls command',
});
```

--------------------------------

### Add Temperature Conversion Tool to AI SDK API Route (TypeScript)

Source: https://v6.ai-sdk.dev/docs/getting-started/nuxt

This TypeScript example extends the existing AI SDK API route by adding a second tool, `convertFahrenheitToCelsius`. This tool allows the model to convert Fahrenheit temperatures to Celsius, demonstrating how to expand the model's capabilities with additional utilities. It showcases handling multiple tools within the `tools` object of the `streamText` configuration.

```typescript
import {
  createGateway,
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from 'ai';
import { z } from 'zod';

export default defineLazyEventHandler(async () => {
  const apiKey = useRuntimeConfig().aiGatewayApiKey;
  if (!apiKey) throw new Error('Missing AI Gateway API key');
  const gateway = createGateway({
    apiKey: apiKey,
  });

  return defineEventHandler(async (event: any) => {
    const { messages }: { messages: UIMessage[] } = await readBody(event);

    const result = streamText({
      model: gateway('openai/gpt-5.1'),
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        weather: tool({
          description: 'Get the weather in a location (fahrenheit)',
          inputSchema: z.object({
            location: z
              .string()
              .describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => {
            const temperature = Math.round(Math.random() * (90 - 32) + 32);
            return {
              location,
              temperature,
            };
          },
        }),
        convertFahrenheitToCelsius: tool({
          description: 'Convert a temperature in fahrenheit to celsius',
          inputSchema: z.object({
            temperature: z
              .number()
              .describe('The temperature in fahrenheit to convert'),
          }),
          execute: async ({ temperature }) => {
            const celsius = Math.round((temperature - 32) * (5 / 9));
            return {
              celsius,
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  });
});
```

--------------------------------

### Example: Convert StringOutputParser Stream

Source: https://v6.ai-sdk.dev/docs/reference/stream-helpers/langchain-adapter

Illustrates converting a stream from a LangChain model piped through `StringOutputParser` using `toUIMessageStream`.

```APIDOC
## Convert StringOutputParser Stream

### Description
This example demonstrates converting a LangChain stream that has been processed by `StringOutputParser` into a UI message stream response using `toUIMessageStream`.

### Method
`POST`

### Endpoint
`/api/completion`

### Request Body
- **prompt** (string) - Required - The prompt to send to the LangChain model.

### Request Example
```json
{
  "prompt": "Tell me a short story."
}
```

### Response
#### Success Response (200)
A `Response` object containing a UI message stream.

#### Response Example
(Stream of UI messages, format depends on `createUIMessageStreamResponse` implementation)
```

--------------------------------

### Inspecting HTTP Request Bodies for AI Models

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompt-engineering

This example shows how to access the raw HTTP request body sent to an AI model provider, such as OpenAI. Accessing `result.request.body` allows for detailed inspection of the exact payload being sent, which is valuable for debugging provider-specific interactions.

```typescript
const result = await generateText({
  model: openai('gpt-5-mini'),
  prompt: 'Hello, world!',
});

console.log(result.request.body);
```

--------------------------------

### Clone AI SDK RAG Starter Repository

Source: https://v6.ai-sdk.dev/docs/guides/rag-chatbot

Use this command to clone the starter repository from GitHub, providing a pre-configured base for the project.

```bash
git clone https://github.com/vercel/ai-sdk-rag-starter
```

--------------------------------

### Provider Registry Setup with Custom Separator

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/provider-management

Illustrates how to create a provider registry with a custom separator character between the provider ID and the model ID. Instead of the default colon (':'), this example uses ' > ' as the separator, offering more flexibility in naming conventions.

```typescript
import { createProviderRegistry } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const customSeparatorRegistry = createProviderRegistry(
  {
    anthropic,
    openai,
  },
  { separator: ' > ' },
);
```

--------------------------------

### Initialize MCP Client with HTTP Transport

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

Demonstrates how to create an MCP client using HTTP transport, recommended for production deployments. Configuration options include URL, headers, and an OAuth provider. Examples show direct configuration and using `StreamableHTTPClientTransport`.

```APIDOC
## SDK Function: `experimental_createMCPClient`

### Description
Initializes an MCP client using HTTP transport to connect to an MCP server. This method is recommended for production deployments due to its robustness and configurability.

### Function Signature
`experimental_createMCPClient(config: MCPClientConfig)`

### Configuration Object (`MCPClientConfig`)
- **transport** (object) - Required - Configuration for the HTTP transport layer.
  - **type** (string) - Required - Must be `'http'`.
  - **url** (string) - Required - The base URL of the MCP server, e.g., `'https://your-server.com/mcp'`.
  - **headers** (object) - Optional - Key-value pairs for custom HTTP headers, e.g., `{ Authorization: 'Bearer my-api-key' }`.
  - **authProvider** (object) - Optional - An OAuth client provider instance for automatic authorization.

### Example Usage: Direct HTTP Configuration
```typescript
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

const mcpClient = await createMCPClient({
  transport: {
    type: 'http',
    url: 'https://your-server.com/mcp',
    headers: { Authorization: 'Bearer my-api-key' },
    authProvider: myOAuthClientProvider,
  },
});
```

### Example Usage: Using `StreamableHTTPClientTransport`
```typescript
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL('https://your-server.com/mcp');
const mcpClient = await createMCPClient({
  transport: new StreamableHTTPClientTransport(url, {
    sessionId: 'session_123', // Optional session ID
  }),
});
```

### Return Value
- **mcpClient** (object) - An instance of the configured MCP client.
```

--------------------------------

### Import Polyfills in Root Layout

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

Imports the `polyfills.js` file into the root `_layout.tsx` of an Expo/React Native project. This ensures the polyfills are loaded and applied before the main application logic.

```ts
import '@/polyfills';
```

--------------------------------

### Build Streaming AI Chat Application in Node.js

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

Implements an interactive streaming AI chat application using the AI SDK in Node.js. This code sets up a readline interface for terminal input, maintains conversation history, and streams responses from an AI model in real-time.

```typescript
import { ModelMessage, streamText } from 'ai';
import 'dotenv/config';
import * as readline from 'node:readline/promises';

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: ModelMessage[] = [];

async function main() {
  while (true) {
    const userInput = await terminal.question('You: ');

    messages.push({ role: 'user', content: userInput });

    const result = streamText({
      model: 'openai/gpt-5.1',
      messages,
    });

    let fullResponse = '';
    process.stdout.write('\nAssistant: ');
    for await (const delta of result.textStream) {
      fullResponse += delta;
      process.stdout.write(delta);
    }
    process.stdout.write('\n\n');

    messages.push({ role: 'assistant', content: fullResponse });
  }
}

main().catch(console.error);
```

--------------------------------

### Add and Commit Local Changes to Git Repository

Source: https://v6.ai-sdk.dev/docs/advanced/vercel-deployment-guide

These commands stage all modified files, commit them with a message, and are typically used to track local changes before pushing to a remote repository. Ensure your .gitignore file excludes sensitive information like environment variables and node_modules.

```bash
git add .
git commit -m "init"
```

--------------------------------

### Accessing Usage Data in AI SDK v4 (onFinish Callback)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This snippet demonstrates how usage information was directly accessible through the `options.usage` parameter within the `onFinish` callback of the `useChat` hook in AI SDK v4. It shows a simple `console.log` example for retrieving and displaying this data.

```tsx
const { messages } = useChat({
  onFinish(message, options) {
    const usage = options.usage;
    console.log('Usage:', usage);
  },
});
```

--------------------------------

### Use ToolLoopAgent with createAgentUIStream (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/agent

This TypeScript example illustrates how to integrate and use an AI SDK agent, specifically the `ToolLoopAgent`, with the `createAgentUIStream` utility. It demonstrates instantiating an agent and then streaming its interactive output, processing each chunk as it becomes available. This is a common pattern for building AI-powered UIs.

```typescript
import { ToolLoopAgent, createAgentUIStream } from "ai";

const agent = new ToolLoopAgent({ ... });

const stream = await createAgentUIStream({
  agent,
  messages: [{ role: "user", content: "What is the weather in NYC?" }]
});

for await (const chunk of stream) {
  console.log(chunk);
}
```

--------------------------------

### Implement Chat UI with AI SDK `useChat` Hook in Next.js

Source: https://v6.ai-sdk.dev/docs/guides/r1

This React component for `app/page.tsx` utilizes the `useChat` hook from `@ai-sdk/react` to manage chat state and interactions. It displays messages, handles user input, and allows for submitting new messages to the AI backend, including rendering model reasoning tokens.

```tsx
'use client';


import { useChat } from '@ai-sdk/react';
import { useState } from 'react';


export default function Page() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };


  return (
    <>
      {messages.map(message => (
        <div key={message.id}>
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, index) => {
            if (part.type === 'reasoning') {
              return <pre key={index}>{part.text}</pre>;
            }
            if (part.type === 'text') {
              return <span key={index}>{part.text}</span>;
            }
            return null;
          })}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input
          name="prompt"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit">Submit</button>
      </form>
    </>
  );
}
```

--------------------------------

### Create Weather Agent with ToolLoopAgent (TypeScript)

Source: https://v6.ai-sdk.dev/docs/foundations/agents

Defines a ToolLoopAgent that queries a weather tool and a conversion tool to answer a prompt in Celsius. Dependencies: the 'ai' package providing ToolLoopAgent, tool, and stepCountIs, and 'zod' for input schemas. Inputs: prompt and tool inputs (location or temperature). Outputs: result.text (final answer) and result.steps (execution steps). Note: this example uses a randomized temperature for illustration and is non-deterministic.

```typescript
import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { z } from 'zod';


const weatherAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  tools: {
    weather: tool({
      description: 'Get the weather in a location (in Fahrenheit)',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
    convertFahrenheitToCelsius: tool({
      description: 'Convert temperature from Fahrenheit to Celsius',
      inputSchema: z.object({
        temperature: z.number().describe('Temperature in Fahrenheit'),
      }),
      execute: async ({ temperature }) => {
        const celsius = Math.round((temperature - 32) * (5 / 9));
        return { celsius };
      },
    }),
  },
  // Agent's default behavior is to stop after a maximum of 20 steps
  // stopWhen: stepCountIs(20),
});


const result = await weatherAgent.generate({
  prompt: 'What is the weather in San Francisco in celsius?',
});


console.log(result.text); // agent's final answer
console.log(result.steps); // steps taken by the agent

```

--------------------------------

### Implement Guardrails Middleware for Content Safety with TypeScript

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/middleware

This middleware example shows how to implement guardrails to ensure safe and appropriate generated text. It intercepts 'generate' calls, processes the output text (e.g., by redacting sensitive information like 'badword'), and returns the cleaned text. The example notes the difficulty of implementing streaming guardrails due to the need for complete stream content.

```typescript
import type { LanguageModelV3Middleware } from '@ai-sdk/provider';

export const yourGuardrailMiddleware: LanguageModelV3Middleware = {
  wrapGenerate: async ({ doGenerate }) => {
    const { text, ...rest } = await doGenerate();

    // filtering approach, e.g. for PII or other sensitive information:
    const cleanedText = text?.replace(/badword/g, '<REDACTED>');

    return { text: cleanedText, ...rest };
  },

  // here you would implement the guardrail logic for streaming
  // Note: streaming guardrails are difficult to implement, because 
  // you do not know the full content of the stream until it's finished.
};

```

--------------------------------

### Configure Vercel AI Gateway API Key in .env

Source: https://v6.ai-sdk.dev/docs/getting-started/nuxt

This snippet demonstrates how to add your Vercel AI Gateway API key to the `.env` file. Replace the placeholder `xxxxxxxxx` with your actual API key. Nuxt will automatically load this variable if prefixed with `NUXT_`, making it accessible within your application.

```env
NUXT_AI_GATEWAY_API_KEY=xxxxxxxxx
```

--------------------------------

### MCPClient.tools() - Get Available Tools

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

Retrieves the tools available from the MCP server. Supports optional schema definitions for compile-time type checking. When schemas are not provided, they are automatically inferred from the server.

```APIDOC
## tools()

### Description
Gets the tools available from the MCP server with optional schema definitions for type checking.

### Method
Async

### Signature
```typescript
async (options?: {
  schemas?: TOOL_SCHEMAS
}) => Promise<McpToolSet<TOOL_SCHEMAS>>
```

### Parameters
#### Options (Optional)
- **schemas** (TOOL_SCHEMAS) - Optional - Schema definitions for compile-time type checking. When not provided, schemas are inferred from the server.

### Returns
Promise<McpToolSet<TOOL_SCHEMAS>> - A promise that resolves to the set of available tools.

### Example Usage
```typescript
const toolSet = await client.tools();

// With schemas
const toolSet = await client.tools({
  schemas: mySchemaDefinitions
});
```
```

--------------------------------

### Create Next.js API Route for AI Chat with DeepSeek R1

Source: https://v6.ai-sdk.dev/docs/guides/r1

This TypeScript code defines a Next.js API route (`/api/chat`) that handles POST requests for chat interactions. It uses the AI SDK's `deepseek` model to stream text responses, converting incoming UI messages to model-compatible messages and optionally sending reasoning tokens back to the client.

```typescript
import { deepseek } from '@ai-sdk/deepseek';
import { convertToModelMessages, streamText, UIMessage } from 'ai';


export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();


  const result = streamText({
    model: deepseek('deepseek-reasoner'),
    messages: convertToModelMessages(messages),
  });


  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
```

--------------------------------

### Example Usage of pipeUIMessageStreamToResponse (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/pipe-ui-message-stream-to-response

Demonstrates how to use pipeUIMessageStreamToResponse to pipe a UI message stream to a Node.js ServerResponse. It includes basic response configuration and an optional stream consumer.

```typescript
pipeUIMessageStreamToResponse({
  response: serverResponse,
  status: 200,
  statusText: 'OK',
  headers: {
    'Custom-Header': 'value',
  },
  stream: myUIMessageStream,
  consumeSseStream: ({ stream }) => {
    // Optional: consume the SSE stream independently
    console.log('Consuming SSE stream:', stream);
  },
});
```

--------------------------------

### Transforming Zod String Dates to JavaScript Date Objects

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompt-engineering

This example demonstrates how to use Zod to define a schema that includes dates as strings and then transform them into JavaScript Date objects. It's useful when models return dates as strings but your application requires Date objects. The `.datetime()` or `.date()` methods are used for validation, and `.transform()` converts the string.

```typescript
const result = await generateObject({
  model: openai('gpt-4.1'),
  schema: z.object({
    events: z.array(
      z.object({
        event: z.string(),
        date:
          z.string()
          .date()
          .transform(value => new Date(value)),
      }),
    ),
  }),
  prompt: 'List 5 important events from the year 2000.',
});
```

--------------------------------

### Server-Side Message ID Generation with `createUIMessageStream`

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence

This example shows an alternative method for server-side message ID generation using `createUIMessageStream`. It involves explicitly writing a 'start' message part with a custom `messageId` generated by `generateId()`. This approach offers fine-grained control over the initial message part of the stream, ensuring persistence compatibility.

```tsx
import {
  generateId,
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';

export async function POST(req: Request) {
  const { messages, chatId } = await req.json();

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      // Write start message part with custom ID
      writer.write({
        type: 'start',
        messageId: generateId(), // Generate server-side ID for persistence
      });

      const result = streamText({
        model: openai('gpt-5-mini'),
        messages: convertToModelMessages(messages),
      });

      writer.merge(result.toUIMessageStream({ sendStart: false })); // omit start message part
    },
    originalMessages: messages,
    onFinish: ({ responseMessage }) => {
      // save your chat here
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

--------------------------------

### Provide Seed for Reproducible Image Generation with OpenAI DALL-E 3

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/image-generation

This example shows how to use the `seed` parameter to ensure reproducible image generation. If supported by the model, providing the same seed will consistently produce the same image for a given prompt.

```tsx
import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Santa Claus driving a Cadillac',
  seed: 1234567890,
});
```

--------------------------------

### Handle fullStream events with switch cases

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-text

The fullStream property allows custom handling of individual stream events including start, text-delta, tool-call, tool-result, and finish events. This enables implementing custom UI or specialized stream processing logic. The example demonstrates handling various event types like text streaming, reasoning, tool execution, and error handling.

```typescript
import { streamText } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: 'openai/gpt-4.1',
  tools: {
    cityAttractions: {
      inputSchema: z.object({ city: z.string() }),
      execute: async ({ city }) => ({
        attractions: ['attraction1', 'attraction2', 'attraction3'],
      }),
    },
  },
  prompt: 'What are some San Francisco tourist attractions?',
});

for await (const part of result.fullStream) {
  switch (part.type) {
    case 'start': {
      // handle start of stream
      break;
    }
    case 'start-step': {
      // handle start of step
      break;
    }
    case 'text-start': {
      // handle text start
      break;
    }
    case 'text-delta': {
      // handle text delta here
      break;
    }
    case 'text-end': {
      // handle text end
      break;
    }
    case 'reasoning-start': {
      // handle reasoning start
      break;
    }
    case 'reasoning-delta': {
      // handle reasoning delta here
      break;
    }
    case 'reasoning-end': {
      // handle reasoning end
      break;
    }
    case 'source': {
      // handle source here
      break;
    }
    case 'file': {
      // handle file here
      break;
    }
    case 'tool-call': {
      switch (part.toolName) {
        case 'cityAttractions': {
          // handle tool call here
          break;
        }
      }
      break;
    }
    case 'tool-input-start': {
      // handle tool input start
      break;
    }
    case 'tool-input-delta': {
      // handle tool input delta
      break;
    }
    case 'tool-input-end': {
      // handle tool input end
      break;
    }
    case 'tool-result': {
      switch (part.toolName) {
        case 'cityAttractions': {
          // handle tool result here
          break;
        }
      }
      break;
    }
    case 'tool-error': {
      // handle tool error
      break;
    }
    case 'finish-step': {
      // handle finish step
      break;
    }
    case 'finish': {
      // handle finish here
      break;
    }
    case 'error': {
      // handle error here
      break;
    }
    case 'raw': {
      // handle raw value
      break;
    }
  }
}
```

--------------------------------

### Access Warnings from Speech Generation

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/speech

This example illustrates how to retrieve warnings generated during the speech synthesis process. Warnings are available on the `warnings` property of the returned audio object and can indicate issues like unsupported parameters.

```typescript
import { openai } from '@ai-sdk/openai';
import { experimental_generateSpeech as generateSpeech } from 'ai';

const audio = await generateSpeech({
  model: openai.speech('tts-1'),
  text: 'Hello, world!',
});

const warnings = audio.warnings;
```

--------------------------------

### Example Usage of pruneMessages (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/prune-messages

Illustrates a practical example of calling pruneMessages with specific options to remove reasoning and tool calls from assistant messages. This is a common pattern for preparing message history for LLM.

```typescript
import { pruneMessages } from 'ai';

const pruned = pruneMessages({
  messages,
  reasoning: 'all', // Remove all reasoning parts
  toolCalls: 'before-last-message', // Remove tool calls except those in the last message
});
```

--------------------------------

### Migrate LlamaIndex Adapter to `@ai-sdk/llamaindex` (AI SDK v5)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

Similar to LangChain, the `LlamaIndexAdapter` is now in its own `@ai-sdk/llamaindex` package in v5. It also adopts the UI message stream pattern for consistent streaming behavior. Ensure you install the new package.

```tsx
import { LlamaIndexAdapter } from 'ai';

const response = LlamaIndexAdapter.toDataStreamResponse(stream);
```

```tsx
import { toUIMessageStream } from '@ai-sdk/llamaindex';
import { createUIMessageStreamResponse } from 'ai';

const response = createUIMessageStreamResponse({
  stream: toUIMessageStream(stream),
});
```

--------------------------------

### Configure Multi-Step Tool Calls with stepCountIs in TypeScript

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

This TypeScript code snippet modifies an `index.ts` file to enable multi-step tool calls for an AI agent. It configures `stopWhen` with `stepCountIs(5)` to allow the agent up to 5 steps for generation and includes an `onStepFinish` callback to log tool results, ensuring the agent utilizes tool output to provide comprehensive answers.

```typescript
import { ModelMessage, streamText, tool, stepCountIs } from 'ai';
import 'dotenv/config';
import { z } from 'zod';
import * as readline from 'node:readline/promises';

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: ModelMessage[] = [];

async function main() {
  while (true) {
    const userInput = await terminal.question('You: ');

    messages.push({ role: 'user', content: userInput });

    const result = streamText({
      model: 'openai/gpt-5.1',
      messages,
      tools: {
        weather: tool({
          description: 'Get the weather in a location (fahrenheit)',
          inputSchema: z.object({
            location: z
              .string()
              .describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => {
            const temperature = Math.round(Math.random() * (90 - 32) + 32);
            return {
              location,
              temperature,
            };
          },
        }),
      },
      stopWhen: stepCountIs(5),
      onStepFinish: async ({ toolResults }) => {
        if (toolResults.length) {
          console.log(JSON.stringify(toolResults, null, 2));
        }
      },
    });

    let fullResponse = '';
    process.stdout.write('\nAssistant: ');
    for await (const delta of result.textStream) {
      fullResponse += delta;
      process.stdout.write(delta);
    }
    process.stdout.write('\n\n');

    messages.push({ role: 'assistant', content: fullResponse });
  }
}

main().catch(console.error);
```

--------------------------------

### Import and Configure Gateway Provider Explicitly - TypeScript

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

Two equivalent methods for explicitly importing and using the gateway provider. Option 1 imports from the default 'ai' package, while Option 2 uses the dedicated '@ai-sdk/gateway' package. Both provide the same functionality as the string-based approach.

```typescript
// Option 1: Import from 'ai' package (included by default)
import { gateway } from 'ai';
model: gateway('openai/gpt-5.1');

// Option 2: Install and import from '@ai-sdk/gateway' package
import { gateway } from '@ai-sdk/gateway';
model: gateway('openai/gpt-5.1');
```

--------------------------------

### Define and Use an AI SDK Tool for Text Generation

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

This TypeScript example demonstrates how to define a tool using `ai.tool` with a description, Zod input schema, and an asynchronous `execute` function. It then integrates this tool into a `generateText` call, allowing the model to access and use the 'weather' tool to respond to a prompt.

```ts
import { z } from 'zod';
import { generateText, tool } from 'ai';

const result = await generateText({
  model: 'openai/gpt-5-mini',
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
  prompt: 'What is the weather in San Francisco?',
});
```

--------------------------------

### Generate Custom User IDs with Specific Size (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-id-generator

Shows an example of creating a specialized ID generator for user IDs using `createIdGenerator`. This generator is configured with a 'user' prefix, an underscore separator, and a specific size of 8 for the random part of the ID. It then generates example IDs.

```typescript
// Create a custom ID generator for user IDs
const generateUserId = createIdGenerator({
  prefix: 'user',
  separator: '_',
  size: 8,
});

// Generate IDs
const id1 = generateUserId(); // e.g., "user_1a2b3c4d"
```

--------------------------------

### Stream AI SDK Agent Response for Storytelling

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent

This TypeScript example shows how to create a `ToolLoopAgent` configured for storytelling and then stream its response. It uses a `for await...of` loop to process the `textStream` and print each chunk to the console, demonstrating real-time output.

```typescript
const agent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  instructions: 'You are a creative storyteller.',
});

const stream = agent.stream({
  prompt: 'Tell me a short story about a time traveler.',
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

--------------------------------

### Example: Convert LangChain Expression Language Stream

Source: https://v6.ai-sdk.dev/docs/reference/stream-helpers/langchain-adapter

Demonstrates how to convert a LangChain Expression Language stream using `toUIMessageStream` and return it as a UI message stream response.

```APIDOC
## Convert LangChain Expression Language Stream

### Description
This example shows how to use `toUIMessageStream` to convert a stream generated by a LangChain model into a format compatible with UI message streams, and then return it as a response.

### Method
`POST`

### Endpoint
`/api/completion`

### Request Body
- **prompt** (string) - Required - The prompt to send to the LangChain model.

### Request Example
```json
{
  "prompt": "What is the weather today?"
}
```

### Response
#### Success Response (200)
A `Response` object containing a UI message stream.

#### Response Example
(Stream of UI messages, format depends on `createUIMessageStreamResponse` implementation)
```

--------------------------------

### Install Zod for Schema Validation in AI SDK

Source: https://v6.ai-sdk.dev/docs/foundations/tools

Zod is a popular TypeScript schema validation library used by the AI SDK to define and validate tool input schemas. Install it using your preferred package manager to enable strong type checking and runtime validation for tool calls.

```shell
pnpm add zod
```

```shell
npm install zod
```

```shell
yarn add zod
```

```shell
bun add zod
```

--------------------------------

### Import createStreamableUI from AI SDK RSC

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-rsc/create-streamable-ui

This snippet shows the necessary import statement to use the `createStreamableUI` function from the `@ai-sdk/rsc` package. Ensure the package is installed in your project.

```typescript
import { createStreamableUI } from "@ai-sdk/rsc";
```

--------------------------------

### Import AIStream in React

Source: https://v6.ai-sdk.dev/docs/reference/stream-helpers/ai-stream

This snippet demonstrates how to import the AIStream class from the 'ai' package for use in React applications. Ensure you have the 'ai' package installed.

```javascript
import { AIStream } from "ai"
```

--------------------------------

### Import `createAI` from AI SDK RSC

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-rsc/create-ai

This snippet shows the basic import statement required to use the `createAI` function from the `@ai-sdk/rsc` package. Ensure the package is installed to use this functionality.

```typescript
import { createAI } from "@ai-sdk/rsc"
```

--------------------------------

### TypeScript: Implement Sequential AI Generations with AI SDK

Source: https://v6.ai-sdk.dev/docs/advanced/sequential-generations

This TypeScript example demonstrates how to perform sequential generations using the AI SDK. It chains multiple `generateText` calls, where the output of one call (e.g., blog post ideas) is used as the input for the next (e.g., selecting the best idea, then creating an outline). It requires the '@ai-sdk/openai' and 'ai' packages.

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

async function sequentialActions() {
  // Generate blog post ideas
  const ideasGeneration = await generateText({
    model: openai('gpt-5-mini'),
    prompt: 'Generate 10 ideas for a blog post about making spaghetti.',
  });

  console.log('Generated Ideas:\n', ideasGeneration);

  // Pick the best idea
  const bestIdeaGeneration = await generateText({
    model: openai('gpt-5-mini'),
    prompt: `Here are some blog post ideas about making spaghetti:
${ideasGeneration}

Pick the best idea from the list above and explain why it's the best.`, 
  });

  console.log('\nBest Idea:\n', bestIdeaGeneration);

  // Generate an outline
  const outlineGeneration = await generateText({
    model: openai('gpt-5-mini'),
    prompt: `We've chosen the following blog post idea about making spaghetti:
${bestIdeaGeneration}

Create a detailed outline for a blog post based on this idea.`, 
  });

  console.log('\nBlog Post Outline:\n', outlineGeneration);
}

sequentialActions().catch(console.error);
```

--------------------------------

### Stream Text from LLM using AI SDK Core

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-text

This example demonstrates how to use the `streamText` function from the AI SDK Core to initiate a streaming response from an LLM. It configures the model and a prompt, then iterates over the `result.textStream` (which is both a `ReadableStream` and an `AsyncIterable`) to log each incoming text part as it's generated.

```ts
import { streamText } from 'ai';

const result = streamText({
  model: 'openai/gpt-4.1',
  prompt: 'Invent a new holiday and describe its traditions.',
});

// example: use textStream as an async iterable
for await (const textPart of result.textStream) {
  console.log(textPart);
}
```

--------------------------------

### Import AWSBedrockStream in React

Source: https://v6.ai-sdk.dev/docs/reference/stream-helpers/aws-bedrock-stream

This snippet shows how to import the AWSBedrockStream utility in a React environment. It requires the 'ai' package to be installed.

```javascript
import { AWSBedrockStream } from "ai"
```

--------------------------------

### Migrate LangChain Adapter to `@ai-sdk/langchain` (AI SDK v5)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

The `LangChainAdapter` has been moved to a dedicated package, `@ai-sdk/langchain`, in AI SDK v5. The API now leverages UI message streams for improved integration and real-time user experiences. Remember to install the new package.

```tsx
import { LangChainAdapter } from 'ai';

const response = LangChainAdapter.toDataStreamResponse(stream);
```

```tsx
import { toUIMessageStream } from '@ai-sdk/langchain';
import { createUIMessageStreamResponse } from 'ai';

const response = createUIMessageStreamResponse({
  stream: toUIMessageStream(stream),
});
```

--------------------------------

### Get Tools from MCP Server (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

Retrieves the tools available from the MCP server. This method accepts an optional `options` object. The `schemas` parameter within `options`, if provided, specifies schema definitions for compile-time type checking; otherwise, schemas are inferred from the server.

```typescript
async (options?: { schemas?: TOOL_SCHEMAS }) => Promise<McpToolSet<TOOL_SCHEMAS>>
```

--------------------------------

### TypeScript: Using System Messages

Source: https://v6.ai-sdk.dev/docs/foundations/prompts

Shows how to set system messages in the `messages` array to guide the AI assistant's behavior and persona. System messages are provided before user messages to establish context or instructions for the model's responses.

```typescript
const result = await generateText({
  model: 'openai/gpt-4.1',
  messages: [
    { role: 'system', content: 'You help planning travel itineraries.' },
    {
      role: 'user',
      content:
        'I am planning a trip to Berlin for 3 days. Please suggest the best tourist activities for me to do.'
    }
  ]
});
```

--------------------------------

### Configure Provider Options for AI SDK Reranking

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/rerank

This example shows how to pass provider-specific options, such as `maxTokensPerDoc` for Cohere, to the `rerank` function. These options allow fine-grained control over how the reranking model processes the documents.

```ts
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: ['sunny day at the beach', 'rainy afternoon in the city'],
  query: 'talk about rain',
  providerOptions: {
    cohere: {
      maxTokensPerDoc: 1000,
    },
  },
});
```

--------------------------------

### Implement GET Handler for Resuming Chat Streams

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams

This TypeScript code implements a Next.js API route to handle GET requests for resuming chat streams. It reads the chat ID from route parameters, checks for an active stream, and either returns a 204 No Content status or resumes the existing stream. It relies on `@util/chat-store` for reading chat data and `resumable-stream` for stream management.

```typescript
import { readChat } from '@util/chat-store';
import { UI_MESSAGE_STREAM_HEADERS } from 'ai';
import { after } from 'next/server';
import { createResumableStreamContext } from 'resumable-stream';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const chat = await readChat(id);

  if (chat.activeStreamId == null) {
    // no content response when there is no active stream
    return new Response(null, { status: 204 });
  }

  const streamContext = createResumableStreamContext({
    waitUntil: after,
  });

  return new Response(
    await streamContext.resumeExistingStream(chat.activeStreamId),
    { headers: UI_MESSAGE_STREAM_HEADERS },
  );
}
```

--------------------------------

### Implement a Custom AI SDK Agent (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/agent

This TypeScript example demonstrates how to create a custom agent by implementing the `Agent` interface from the AI SDK. It defines a `MyEchoAgent` class with `generate` and `stream` methods that simply return the input prompt or stringified messages. This serves as a basic template for building custom agent logic.

```typescript
import { Agent, GenerateTextResult, StreamTextResult } from 'ai';
import type { ModelMessage } from '@ai-sdk/provider-utils';

class MyEchoAgent implements Agent {
  version = 'agent-v1' as const;
  id = 'echo';
  tools = {};

  async generate({ prompt, messages, abortSignal }) {
    const text = prompt ?? JSON.stringify(messages);
    return { text, steps: [] };
  }

  async stream({ prompt, messages, abortSignal }) {
    const text = prompt ?? JSON.stringify(messages);
    return {
      textStream: (async function* () {
        yield text;
      })(),
    };
  }
}
```

--------------------------------

### Adapt Reasoning Stream Handling to Start/Delta/End Pattern (AI SDK v5)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

The reasoning content stream in AI SDK v5 now aligns with the new `start`/`delta`/`end` streaming protocol. This provides finer-grained control and updates for reasoning blocks, replacing the single-chunk `reasoning` type with distinct phases identified by unique IDs.

```tsx
for await (const chunk of result.fullStream) {
  switch (chunk.type) {
    case 'reasoning': {
      // Single chunk with full reasoning text
      console.log('Reasoning:', chunk.text);
      break;
    }
  }
}
```

```tsx
for await (const chunk of result.fullStream) {
  switch (chunk.type) {
    case 'reasoning-start': {
      console.log(`Starting reasoning block: ${chunk.id}`);
      break;
    }
    case 'reasoning-delta': {
      process.stdout.write(chunk.delta);
      break;
    }
    case 'reasoning-end': {
      console.log(`Completed reasoning block: ${chunk.id}`);
      break;
    }
  }
}
```

--------------------------------

### Generate Text with Basic Prompt using AI SDK Core (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-text

This example demonstrates how to use the `generateText` function from the AI SDK Core to generate text based on a simple prompt. It sends a request to an OpenAI GPT-4.1 model to create a vegetarian lasagna recipe.

```tsx
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'openai/gpt-4.1',
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

--------------------------------

### Run Drizzle Kit Migrations (Bash)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0-data

Commands to generate and apply database migrations using Drizzle Kit. These commands are essential for creating the new v5 message table.

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

--------------------------------

### Implement AI SDK Polyfills for React Native

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

Creates a `polyfills.js` file that conditionally polyfills `structuredClone`, `TextEncoderStream`, and `TextDecoderStream` for non-web React Native platforms. It imports necessary modules and uses `polyfillGlobal` to make them available.

```ts
import { Platform } from 'react-native';
import structuredClone from '@ungap/structured-clone';

if (Platform.OS !== 'web') {
  const setupPolyfills = async () => {
    const { polyfillGlobal } = await import(
      'react-native/Libraries/Utilities/PolyfillFunctions'
    );

    const { TextEncoderStream, TextDecoderStream } = await import(
      '@stardazed/streams-text-encoding'
    );

    if (!('structuredClone' in global)) {
      polyfillGlobal('structuredClone', () => structuredClone);
    }

    polyfillGlobal('TextEncoderStream', () => TextEncoderStream);
    polyfillGlobal('TextDecoderStream', () => TextDecoderStream);
  };

  setupPolyfills();
}

export {};
```

--------------------------------

### Basic Text Completion UI with useCompletion (React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/completion

This example demonstrates a basic form for submitting prompts and displaying AI-generated completions using the `useCompletion` hook. It manages input, submission, and displays the streaming completion. The `api` option specifies the backend endpoint for completions.

```tsx
'use client';

import { useCompletion } from '@ai-sdk/react';

export default function Page() {
  const { completion, input, handleInputChange, handleSubmit } = useCompletion({
    api: '/api/completion',
  });

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="prompt"
        value={input}
        onChange={handleInputChange}
        id="input"
      />
      <button type="submit">Submit</button>
      <div>{completion}</div>
    </form>
  );
}

```

--------------------------------

### Configure Agent with Basic System Instructions (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/building-agents

This snippet demonstrates how to initialize a `ToolLoopAgent` and set its fundamental role and expertise using the `instructions` property. It defines the agent's core identity and purpose.

```ts
const agent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  instructions:
    'You are an expert data analyst. You provide clear insights from complex data.',
});
```

--------------------------------

### GET /schema/tools

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/stream-text

Returns the ToolSet schema describing tools available to the model. Use this endpoint to discover tool metadata and input schemas the model can call, including parameter structures.

```APIDOC
## GET /schema/tools

### Description
Returns the ToolSet schema describing tools available to the model. Use this endpoint to discover tool metadata and input schemas that the model can call.

### Method
GET

### Endpoint
/schema/tools

### Parameters
#### Path Parameters
- **none**

#### Query Parameters
- **none**

#### Request Body
- **none**

### Request Example
{}

### Response
#### Success Response (200)
- **tools** (array of Tool) - The list of tools available to the model.

Tool object fields:
- **description** (string) - Optional human-readable description of the tool's purpose.
- **inputSchema** (object) - Zod/OpenAPI-like schema describing the tool's input parameters.

#### Response Example
{
  "tools": [
    {
      "description": "Search tool for web queries",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Search query string" },
          "limit": { "type": "integer", "description": "Number of results to return", "optional": true }
        },
        "required": ["query"]
      }
    }
  ]
}

```

--------------------------------

### Assistant Message with File Content

Source: https://v6.ai-sdk.dev/docs/foundations/prompts

Shows an example of an assistant message containing file content, such as an image generated by the model. Note that this feature is model-dependent and only supported for specific file types that the model can generate.

```ts
import fs from 'fs';

const result = await generateText({
  model: 'openai/gpt-4.1',
  messages: [
    { role: 'user', content: 'Generate an image of a roquefort cheese!' },
    {
      role: 'assistant',
      content: [
        {
          type: 'file',
          mediaType: 'image/png',
          data: fs.readFileSync('./data/roquefort.jpg'),
        },
      ],
    },
  ],
});
```

--------------------------------

### Create New Next.js Application

Source: https://v6.ai-sdk.dev/docs/guides/multi-modal-chatbot

This command initializes a new Next.js project named 'multi-modal-agent' in the current directory using `pnpm`. It sets up a basic Next.js application structure, prompting to use the App Router.

```bash
pnpm create next-app@latest multi-modal-agent
```

--------------------------------

### Define and Export a Custom AI SDK Tool

Source: https://v6.ai-sdk.dev/docs/foundations/tools

This TypeScript example illustrates how to define a custom AI SDK tool with a description, a Zod-based input schema, and an asynchronous `execute` function. Exporting this tool allows it to be packaged and distributed via npm, making it reusable across projects and the community.

```typescript
// my-tools/index.ts
export const myTool = {
  description: 'A helpful tool',
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    // your tool logic
    return result;
  },
};
```

--------------------------------

### Handling Optional Parameters for Tool Compatibility with Zod

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompt-engineering

This snippet illustrates the difference between using `.optional()` and `.nullable()` for optional parameters in Zod schemas when working with tools. Using `.nullable()` is recommended for better compatibility with strict schema validation, particularly with providers like OpenAI.

```typescript
// This may fail with strict schema validation
const failingTool = tool({
  description: 'Execute a command',
  inputSchema: z.object({
    command: z.string(),
    workdir: z.string().optional(), // This can cause errors
    timeout: z.string().optional(),
  }),
});

// This works with strict schema validation
const workingTool = tool({
  description: 'Execute a command',
  inputSchema: z.object({
    command: z.string(),
    workdir: z.string().nullable(), // Use nullable instead
    timeout: z.string().nullable(),
  }),
});
```

--------------------------------

### Import CohereStream in React

Source: https://v6.ai-sdk.dev/docs/reference/stream-helpers/cohere-stream

This snippet shows how to import the CohereStream function from the 'ai' package, which is necessary for using its functionality within a React application. Ensure you have the AI SDK installed.

```javascript
import { CohereStream } from "ai"
```

--------------------------------

### Navigate to Project Directory

Source: https://v6.ai-sdk.dev/docs/guides/rag-chatbot

After cloning, use this command to change your current directory into the newly created project folder.

```bash
cd ai-sdk-rag-starter
```

--------------------------------

### Get MCP Prompt with arguments (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

This code illustrates how to retrieve a specific prompt by name and optionally pass arguments defined by the server. This allows for dynamic generation of prompt messages.

```typescript
const prompt = await mcpClient.getPrompt({
  name: 'code_review',
  arguments: { code: 'function add(a, b) { return a + b; }' },
});
```

--------------------------------

### getAIState

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-rsc/get-ai-state

Retrieves the current AI state. Optionally, you can specify a key to get a specific value from the AI state if it's an object.

```APIDOC
## getAIState

### Description
Retrieves the current AI state. Optionally, you can specify a key to get a specific value from the AI state if it's an object.

### Method
GET

### Endpoint
/AI/state

### Parameters
#### Query Parameters
- **key** (string) - Optional - Returns the value of the specified key in the AI state, if it's an object.

### Request Example
(No request body for this endpoint)

### Response
#### Success Response (200)
- **AI State** (object | any) - The current AI state or the value associated with the specified key.

#### Response Example
```json
{
  "someKey": "someValue",
  "anotherKey": 123
}
```
```

--------------------------------

### Combine Multiple Dynamic Modifications in AI SDK Agent prepareCall

Source: https://v6.ai-sdk.dev/docs/agents/configuring-call-options

This example illustrates how to dynamically adjust multiple agent settings—such as the AI model, active tools, and instructions—based on runtime options passed to `generate`. The `prepareCall` function uses conditional logic to upgrade the model for urgent requests, limit tool access based on user roles, and customize instructions, providing flexible and context-aware agent behavior.

```ts
import { ToolLoopAgent } from 'ai';
import { z } from 'zod';

const agent = new ToolLoopAgent({
  model: 'openai/gpt-5-nano',
  callOptionsSchema: z.object({
    userRole: z.enum(['admin', 'user']),
    urgency: z.enum(['low', 'high']),
  }),
  tools: {
    readDatabase: readDatabaseTool,
    writeDatabase: writeDatabaseTool,
  },
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    // Upgrade model for urgent requests
    model: options.urgency === 'high' ? 'openai/gpt-5' : settings.model,
    // Limit tools based on user role
    activeTools:
      options.userRole === 'admin'
        ? ['readDatabase', 'writeDatabase']
        : ['readDatabase'],
    // Adjust instructions
    instructions: `You are a ${options.userRole} assistant.\n${options.userRole === 'admin' ? 'You have full database access.' : 'You have read-only access.'}`,
  }),
});

await agent.generate({
  prompt: 'Update the user record',
  options: {
    userRole: 'admin',
    urgency: 'high',
  },
});
```

--------------------------------

### Mocking streamText with AI SDK Core

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/testing

Illustrates testing the `streamText` function using `MockLanguageModelV3` and `simulateReadableStream` to control the streamed output. This setup allows for deterministic testing of streaming logic, simulating various text-delta and finish events.

```typescript
import { streamText, simulateReadableStream } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

const result = streamText({
  model: new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-start', id: 'text-1' },
          { type: 'text-delta', id: 'text-1', delta: 'Hello' },
          { type: 'text-delta', id: 'text-1', delta: ', ' },
          { type: 'text-delta', id: 'text-1', delta: 'world!' },
          { type: 'text-end', id: 'text-1' },
          {
            type: 'finish',
            finishReason: 'stop',
            logprobs: undefined,
            usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
          },
        ],
      }),
    }),
  }),
  prompt: 'Hello, test!',
});
```

--------------------------------

### Restore AI State on Mount

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/saving-and-restoring-states

This code example shows how to restore AI chat history from a database when a component mounts. It uses the `initialAIState` prop, passed to the context provider created by `createAI`.

```tsx
import { ReactNode } from 'react';
import { AI } from './ai';

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const chat = await loadChatFromDB();

  return (
    <html lang="en">
      <body>
        <AI initialAIState={chat}>{children}</AI>
      </body>
    </html>
  );
}
```

--------------------------------

### Basic Usage of stepCountIs (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/step-count-is

Demonstrates a basic implementation of `stepCountIs` within the `generateText` function. This example sets up text generation that will stop after exactly 3 steps, providing a clear control mechanism for the generation process.

```typescript
import { generateText, stepCountIs } from 'ai';

const result = await generateText({
  model: yourModel,
  tools: yourTools,
  stopWhen: stepCountIs(3),
});
```

--------------------------------

### Stream Partial Structured Output with ToolLoopAgent (TypeScript)

Source: https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta

This example illustrates how to stream structured output using `agent.stream()` with `ToolLoopAgent`. It defines an agent to generate person profiles with a Zod schema and shows how to iterate over `partialOutputStream` to access incomplete structured data as it's being generated.

```typescript
import { ToolLoopAgent, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const profileAgent = new ToolLoopAgent({
  model: openai('gpt-5-mini'),
  instructions: 'Generate realistic person profiles.',
  output: Output.object({
    schema: z.object({
      name: z.string(),
      age: z.number(),
      occupation: z.string(),
    }),
  }),
});

const { partialOutputStream } = await profileAgent.stream({
  prompt: 'Generate a person profile.',
});

for await (const partial of partialOutputStream) {
  console.log(partial);
  // { name: "John" }
  // { name: "John", age: 30 }
  // { name: "John", age: 30, occupation: "Engineer" }
}
```

--------------------------------

### Create Custom Stop Conditions

Source: https://v6.ai-sdk.dev/docs/agents/loop-control

Illustrates how to build custom stopping conditions by implementing the StopCondition interface. The example stops when the model generates text containing 'ANSWER:'.

```TypeScript
import { ToolLoopAgent, StopCondition, ToolSet } from 'ai';

const tools = {
  // your tools
} satisfies ToolSet;

const hasAnswer: StopCondition<typeof tools> = ({ steps }) => {
  // Stop when the model generates text containing "ANSWER:"
  return steps.some(step => step.text?.includes('ANSWER:')) ?? false;
};

const agent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  tools,
  stopWhen: hasAnswer,
});

const result = await agent.generate({
  prompt: 'Find the answer and respond with "ANSWER: [your answer]"',
});
```

--------------------------------

### AI SDK ToolLoopAgent with Approved Tool Execution

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent

This TypeScript example demonstrates setting up a `ToolLoopAgent` with an OpenAI tool (weather API). It shows how the agent can be configured to use external tools and implies the possibility of adding logic for tool execution approval or other custom behaviors.

```typescript
import { openai } from '@ai-sdk/openai';
import { ToolLoopAgent } from 'ai';

const agent = new ToolLoopAgent({
  model: openai('gpt-5-mini'),
  instructions: 'You are an agent with access to a weather API.',
  tools: {
    weather: openai.tools.weather({
      /* ... */
    }),
  },
  // Optionally require approval, etc.
});

const result = await agent.generate({
  prompt: 'Is it raining in Paris today?',
});
console.log(result.text);
```

--------------------------------

### Integrate weather tool with AI agent using ai SDK (TypeScript)

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

This snippet modifies an 'index.ts' file to add a new 'weather' tool to an AI agent. It imports necessary functions from 'ai' and 'zod', defines the tool with a description, input schema for 'location', and an 'execute' function that simulates fetching weather data. The agent streams text responses and uses the defined tools.

```typescript
import { ModelMessage, streamText, tool } from 'ai';
import 'dotenv/config';
import { z } from 'zod';
import * as readline from 'node:readline/promises';

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: ModelMessage[] = [];

async function main() {
  while (true) {
    const userInput = await terminal.question('You: ');

    messages.push({ role: 'user', content: userInput });

    const result = streamText({
      model: 'openai/gpt-5.1',
      messages,
      tools: {
        weather: tool({
          description: 'Get the weather in a location (fahrenheit)',
          inputSchema: z.object({
            location: z
              .string()
              .describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => {
            const temperature = Math.round(Math.random() * (90 - 32) + 32);
            return {
              location,
              temperature,
            };
          },
        }),
      },
    });

    let fullResponse = '';
    process.stdout.write('\nAssistant: ');
    for await (const delta of result.textStream) {
      fullResponse += delta;
      process.stdout.write(delta);
    }
    process.stdout.write('\n\n');

    messages.push({ role: 'assistant', content: fullResponse });
  }
}

main().catch(console.error);
```

--------------------------------

### MCPClient.listPrompts() - List Available Prompts

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

Lists available prompts from the MCP server with pagination support. Prompts are predefined templates that can be used for generating content or interactions.

```APIDOC
## listPrompts()

### Description
Lists available prompts from the MCP server with pagination support.

### Method
Async

### Signature
```typescript
async (options?: {
  params?: PaginatedRequest['params'];
  options?: RequestOptions;
}) => Promise<ListPromptsResult>
```

### Parameters
#### Options (Optional)
- **params** (PaginatedRequest['params']) - Optional - Pagination parameters including cursor.
- **options** (RequestOptions) - Optional - Request options including signal and timeout.

### Returns
Promise<ListPromptsResult> - A promise that resolves to the list of available prompts.

### Example Usage
```typescript
const prompts = await client.listPrompts();

// With pagination
const prompts = await client.listPrompts({
  params: { cursor: 'next-page' },
  options: { timeout: 5000 }
});
```
```

--------------------------------

### POST /api/chat

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages

This endpoint serves as an example for processing incoming UI messages, converting them into AI model-compatible `ModelMessage` objects using `convertToModelMessages`, and streaming back the AI's response.

```APIDOC
## POST /api/chat

### Description
This endpoint handles chat requests by receiving an array of UI messages, converting them into a format compatible with AI models using the `convertToModelMessages` function, and streaming back the AI model's response. It demonstrates a common pattern for integrating the AI SDK into a backend route.

The `convertToModelMessages` function itself takes two parameters:
- **`messages`**: An array of UI messages from the `useChat` hook to be converted.
- **`options`**: An optional configuration object. This can include `tools` to enable multi-modal tool responses (e.g., `screenshotTool` example) and a `convertDataPart` callback to transform custom data parts (e.g., URLs, code files) into model-compatible content (e.g., `TextPart`, `FilePart`). These options are configured server-side within the API route.

### Method
POST

### Endpoint
/api/chat

### Parameters
#### Request Body
- **messages** (Message[]) - Required - An array of UI messages, typically from a `useChat` hook, that need to be processed by the AI model.

### Request Example
```json
{
  "messages": [
    { "id": "user-msg-1", "role": "user", "content": "What is the capital of France?" },
    { "id": "assistant-msg-1", "role": "assistant", "content": "Paris." }
  ]
}
```

### Response
#### Success Response (200)
A stream of UI messages, compatible with `result.toUIMessageStreamResponse()`, representing the AI model's output. The stream can contain various content types like text, tool calls, or other structured data.

#### Response Example
```json
{
  "id": "assistant-stream-1",
  "role": "assistant",
  "content": "The capital of France is Paris."
}
// ... additional stream chunks follow ...
```
```

--------------------------------

### Get a Specific Prompt from MCP Server (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

Retrieves a prompt by its name, with the option to pass arguments to fill into the prompt. This method requires an `args` object containing the `name` of the prompt. Optional `arguments` can be provided, along with `options` for the request, such as signal and timeout.

```typescript
async (args: { name: string; arguments?: Record<string, unknown>; options?: RequestOptions; }) => Promise<GetPromptResult>
```

--------------------------------

### GET /schema/messages

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/stream-text

Returns message and message-part type definitions used by the assistant and tools. This endpoint documents types like ToolModelMessage, ToolResultPart, FilePart, ReasoningPart, and ToolCallPart and their fields.

```APIDOC
## GET /schema/messages

### Description
Returns message and message-part type definitions used by the assistant and tools. Use this endpoint to understand how messages are structured (ToolModelMessage, ToolResultPart, FilePart, ReasoningPart, ToolCallPart).

### Method
GET

### Endpoint
/schema/messages

### Parameters
#### Path Parameters
- **none**

#### Query Parameters
- **none**

#### Request Body
- **none**

### Request Example
{}

### Response
#### Success Response (200)
- **messages** (array) - Definitions of message types and their parts.

Common types described:
- ToolModelMessage:
  - **role** ("tool") - The role for the assistant message.
  - **content** (Array of ToolResultPart) - The message parts returned by a tool.
- ToolResultPart:
  - **type** ("tool-result") - The type of the message part.
  - **toolCallId** (string) - Id of the tool call the result corresponds to.
  - **toolName** (string) - Name of the tool.
  - **result** (unknown) - Tool execution result payload.
  - **isError** (boolean) - Optional flag indicating an error.
- FilePart:
  - **type** ("file")
  - **data** (string | Uint8Array | Buffer | ArrayBuffer | URL) - File content; strings may be base64, data URLs, or http(s) URLs.
  - **mediaType** (string) - IANA media type.
  - **filename** (string) - Optional file name.
- ReasoningPart:
  - **type** ("reasoning")
  - **text** (string) - The reasoning text.
- ToolCallPart:
  - **type** ("tool-call")
  - **toolCallId** (string)
  - **toolName** (string)
  - **input** (object) - Parameters generated by the model for the tool.

#### Response Example
{
  "messages": [
    {
      "type": "ToolModelMessage",
      "role": "tool",
      "content": [
        {
          "type": "tool-result",
          "toolCallId": "call_123",
          "toolName": "translate",
          "result": { "translatedText": "Bonjour" }
        }
      ]
    },
    {
      "type": "UserMessage",
      "role": "user",
      "content": [
        {
          "type": "file",
          "data": "https://example.com/image.png",
          "mediaType": "image/png",
          "filename": "image.png"
        }
      ]
    }
  ]
}

```

--------------------------------

### React Chat Hook Setup with Tool Execution

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot-with-tool-calling

Initializes the useChat hook with DefaultChatTransport, configures automatic message sending when tool calls are complete, and implements onToolCall handler for client-side tool execution. Includes error handling with addToolOutput for failed tool calls.

```typescript
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';

const { messages, sendMessage, addToolOutput } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
  }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  async onToolCall({ toolCall }) {
    if (toolCall.dynamic) {
      return;
    }
    if (toolCall.toolName === 'getWeatherInformation') {
      try {
        const weather = await getWeatherInformation(toolCall.input);
        addToolOutput({
          tool: 'getWeatherInformation',
          toolCallId: toolCall.toolCallId,
          output: weather,
        });
      } catch (err) {
        addToolOutput({
          tool: 'getWeatherInformation',
          toolCallId: toolCall.toolCallId,
          state: 'output-error',
          errorText: 'Unable to get the weather information',
        });
      }
    }
  },
});
```

--------------------------------

### Generate API Configuration Parameters

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-rsc/stream-ui

Reference documentation for all available configuration parameters when calling the generate API. This includes model behavior settings, tool definitions, callbacks, and provider-specific options.

```APIDOC
## Generate API Configuration

### Description
Configuration parameters for the AI SDK generate function, which handles model inference with support for tools, streaming, retries, and custom callbacks.

### Parameters

#### Model Behavior
- **seed** (integer) - Optional - The seed to use for random sampling. If set and supported by the model, calls will generate deterministic results.
- **maxRetries** (number) - Optional - Maximum number of retries. Set to 0 to disable retries. Default: 2.

#### Request Control
- **abortSignal** (AbortSignal) - Optional - An optional abort signal that can be used to cancel the call.
- **headers** (Record<string, string>) - Optional - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.

#### Tools Configuration
- **tools** (ToolSet) - Required - Tools that are accessible to and can be called by the model.
  - **Tool Properties:**
    - **description** (string) - Optional - Information about the purpose of the tool including details on how and when it can be used by the model.
    - **parameters** (zod schema) - Required - The typed schema that describes the parameters of the tool that can also be used for validation and error handling.
    - **generate** ((async (parameters) => ReactNode) | AsyncGenerator<ReactNode, ReactNode, void>) - Optional - A function or generator function that is called with the arguments from the tool call and yields React nodes as the UI.

- **toolChoice** ("auto" | "none" | "required" | { "type": "tool", "toolName": string }) - Optional - The tool choice setting specifying how tools are selected for execution. Default: "auto". "none" disables tool execution. "required" requires tools to be executed. Specific tool selection uses { "type": "tool", "toolName": string }.

#### Callbacks
- **text** ((Text) => ReactNode) - Optional - Callback to handle the generated tokens from the model.
  - **Text Properties:**
    - **content** (string) - Required - The full content of the completion.
    - **delta** (string) - Required - The delta of the current token.
    - **done** (boolean) - Required - Whether the generation is complete.

- **onFinish** ((result: OnFinishResult) => void) - Optional - Callback that is called when the LLM response and all request tool executions are finished.
  - **OnFinishResult Properties:**
    - **usage** (TokenUsage) - Required - The token usage of the generated text.
      - **TokenUsage Properties:**
        - **promptTokens** (number) - Required - The total number of tokens in the prompt.
        - **completionTokens** (number) - Required - The total number of tokens in the completion.
        - **totalTokens** (number) - Required - The total number of tokens generated.
    - **value** (ReactNode) - Required - The final UI node that was generated.
    - **warnings** (Warning[] | undefined) - Optional - Warnings from the model provider (e.g. unsupported settings).
    - **response** (Response) - Required - The response object from the model.

#### Provider Options
- **providerOptions** (Record<string, JSONObject> | undefined) - Optional - Provider-specific options. The outer key is the provider name. The inner values are the metadata. Details depend on the provider.
```

--------------------------------

### Japanese Language Chunking with smoothStream (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/smooth-stream

Example of configuring smoothStream for Japanese text streaming using a custom regex to handle character-based chunking, as word delimiters are not space-based in Japanese.

```tsx
import { smoothStream, streamText } from 'ai';

const result = streamText({
  model: 'openai/gpt-4.1',
  prompt: 'Your prompt here',
  experimental_transform: smoothStream({
    chunking: /[぀-ゟ゠-ヿ]|S+s+/,
  }),
});
```

--------------------------------

### Chinese Language Chunking with smoothStream (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/smooth-stream

Example of configuring smoothStream for Chinese text streaming using a custom regex to handle character-based chunking, as word delimiters are not space-based in Chinese.

```tsx
import { smoothStream, streamText } from 'ai';

const result = streamText({
  model: 'openai/gpt-4.1',
  prompt: 'Your prompt here',
  experimental_transform: smoothStream({
    chunking: /[一-鿿]|S+s+/,
  }),
});
```

--------------------------------

### Implement Retrieval Augmented Generation (RAG) with AI SDK Agent prepareCall

Source: https://v6.ai-sdk.dev/docs/agents/configuring-call-options

This snippet demonstrates how to use the `prepareCall` function within an AI SDK `ToolLoopAgent` to implement Retrieval Augmented Generation (RAG). It shows how to asynchronously fetch relevant documents based on a query (e.g., from a vector store) and inject their content directly into the agent's instructions, allowing the agent to answer questions using provided context.

```ts
import { ToolLoopAgent } from 'ai';
import { z } from 'zod';

const ragAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  callOptionsSchema: z.object({
    query: z.string(),
  }),
  prepareCall: async ({ options, ...settings }) => {
    // Fetch relevant documents (this can be async)
    const documents = await vectorSearch(options.query);

    return {
      ...settings,
      instructions: `Answer questions using the following context:

${documents.map(doc => doc.content).join('\n\n')}`,
    };
  },
});

await ragAgent.generate({
  prompt: 'What is our refund policy?',
  options: { query: 'refund policy' },
});
```

--------------------------------

### API Route for Streaming Chat Responses (Node.js/TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces

Sets up an API route using `streamText` from the AI SDK to handle chat requests. It processes messages, interacts with an LLM (OpenAI in this example), and streams responses back to the client. Dependencies include `ai` and `@ai-sdk/openai`.

```ts
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai';

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: openai('gpt-5-mini'),
    system: 'You are a friendly assistant!',
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}

```

--------------------------------

### Configure AI SDK 5 Migration MCP Server in Cursor

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This JSON snippet shows how to configure the AI SDK 5 Migration MCP Server in your project's `.cursor/mcp.json` file. This setup enables AI-assisted migration using compatible coding agents like Cursor by defining the server's URL.

```json
{
  "mcpServers": {
    "ai-sdk-5-migration": {
      "url": "https://ai-sdk-5-migration-mcp-server.vercel.app/api/mcp"
    }
  }
}
```

--------------------------------

### Configure ToolLoopAgent with Type-Safe Call Options

Source: https://v6.ai-sdk.dev/docs/introduction/announcing-ai-sdk-6-beta

This example shows how to define and use type-safe call options for an `ToolLoopAgent` to dynamically configure its behavior at runtime. It uses Zod for schema validation and demonstrates injecting user context (like account type and user ID) into the agent's instructions based on options provided during the `generate` call.

```typescript
import { ToolLoopAgent } from 'ai';
import { z } from 'zod';


const supportAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  callOptionsSchema: z.object({
    userId: z.string(),
    accountType: z.enum(['free', 'pro', 'enterprise']),
  }),
  instructions: 'You are a helpful customer support agent.',
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions:
      settings.instructions +
      `\nUser context:\n- Account type: ${options.accountType}\n- User ID: ${options.userId}\n\nAdjust your response based on the user's account level.`,
  }),
});


// Pass options when calling the agent
const result = await supportAgent.generate({
  prompt: 'How do I upgrade my account?',
  options: {
    userId: 'user_123',
    accountType: 'free',
  },
});
```

--------------------------------

### Display Source URLs and Documents on Client (React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot

Provides a React example for rendering source information received from the AI. It filters message parts to identify 'source-url' and 'source-document' types. URL sources are displayed as clickable links with titles, while document sources are shown with their titles.

```tsx
messages.map(message => (
  <div key={message.id}>
    {message.role === 'user' ? 'User: ' : 'AI: '}

    {/* Render URL sources */}
    {message.parts
      .filter(part => part.type === 'source-url')
      .map(part => (
        <span key={`source-${part.id}`}>
          [
          <a href={part.url} target="_blank">
            {part.title ?? new URL(part.url).hostname}
          </a>
          ]
        </span>
      ))}

    {/* Render document sources */}
    {message.parts
      .filter(part => part.type === 'source-document')
      .map(part => (
        <span key={`source-${part.id}`}>
          [<span>{part.title ?? `Document ${part.id}`}</span>]
        </span>
      ))}
  </div>
));
```

--------------------------------

### Implement Streaming Simulation for OpenAI Models in AI SDK 4 and 5

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This example demonstrates how streaming simulation functionality has evolved between AI SDK 4 and 5. AI SDK 4 used a `simulateStreaming` model option, while AI SDK 5 replaces this with `simulateStreamingMiddleware` applied via `wrapLanguageModel`.

```tsx
const result = generateText({
  model: openai('gpt-4.1', { simulateStreaming: true }),
  prompt: 'Hello, world!',
});
```

```tsx
import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai';

const model = wrapLanguageModel({
  model: openai('gpt-4.1'),
  middleware: simulateStreamingMiddleware(),
});

const result = generateText({
  model,
  prompt: 'Hello, world!',
});
```

--------------------------------

### GET /api/chat/[id]/stream

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams

Retrieves an active chat stream or returns 204 if no stream is active. This endpoint is used to resume a previously interrupted chat stream.

```APIDOC
## GET /api/chat/[id]/stream

### Description
This endpoint allows clients to resume an existing chat stream. It checks for an active stream associated with the provided chat ID and returns the stream if found. If no active stream exists, it returns a 204 No Content response.

### Method
GET

### Endpoint
`/api/chat/[id]/stream`

### Parameters
#### Path Parameters
- **id** (string) - Required - The unique identifier of the chat session.

### Request Example
This endpoint does not require a request body.

### Response
#### Success Response (200 OK)
- **ReadableStream** - The active chat stream.

#### Error Response (204 No Content)
- **null** - Returned when no active stream is found for the given chat ID.

#### Response Example (200 OK)
```
// A ReadableStream object representing the chat stream
```

#### Response Example (204 No Content)
```
(No content)
```
```

--------------------------------

### Reinitialize Git Repository if 'remote origin already exists' Error

Source: https://v6.ai-sdk.dev/docs/advanced/vercel-deployment-guide

This sequence of commands is used to remove an existing .git directory, reinitialize a new Git repository, stage all files, and create an initial commit. This is a workaround for situations where a local repository is incorrectly linked to a remote one.

```bash
rm -rf .git
git init
git add .
git commit -m "init"
```

--------------------------------

### Implement Vue Chat UI with AI SDK

Source: https://v6.ai-sdk.dev/docs/getting-started/nuxt

This Vue component sets up a chat interface using the `@ai-sdk/vue` library. It initializes a chat instance, manages user input via a local `ref`, and handles form submission to send messages. The component displays messages from the chat state, differentiating between user and AI roles, and renders text parts of each message.

```vue
<script setup lang="ts">
import { Chat } from "@ai-sdk/vue";
import { ref } from "vue";

const input = ref("");
const chat = new Chat({});

const handleSubmit = (e: Event) => {
    e.preventDefault();
    chat.sendMessage({ text: input.value });
    input.value = "";
};
</script>

<template>
    <div>
        <div v-for="(m, index) in chat.messages" :key="m.id ? m.id : index">
            {{ m.role === "user" ? "User: " : "AI: " }}
            <div
                v-for="(part, index) in m.parts"
                :key="`${m.id}-${part.type}-${index}`"
            >
                <div v-if="part.type === 'text'">{{ part.text }}</div>
            </div>
        </div>

        <form @submit="handleSubmit">
            <input v-model="input" placeholder="Say something..." />
        </form>
    </div>
</template>
```

--------------------------------

### List Prompts from MCP Server (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

Lists available prompts from the MCP server. This method accepts an optional `options` object. It supports optional `params` for pagination, including a cursor, and general `options` for the request like signal and timeout.

```typescript
async (options?: { params?: PaginatedRequest['params']; options?: RequestOptions; }) => Promise<ListPromptsResult>
```

--------------------------------

### Implement dynamic tool approval based on input conditions (TypeScript)

Source: https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta

This TypeScript example shows how to conditionally require tool approval by providing an asynchronous function to the `needsApproval` property. The `paymentTool` is configured to request approval only for transactions exceeding $1000, allowing for flexible and context-aware control over tool execution based on input parameters.

```typescript
export const paymentTool = tool({
  description: 'Process a payment',
  inputSchema: z.object({
    amount: z.number(),
    recipient: z.string(),
  }),
  // Only require approval for large transactions
  needsApproval: async ({ amount }) => amount > 1000,
  execute: async ({ amount, recipient }) => {
    return await processPayment(amount, recipient);
  },
});
```

--------------------------------

### POST /api/chat - Stream AI Chat Response

Source: https://v6.ai-sdk.dev/docs/getting-started/nextjs-pages-router

This endpoint handles chat message requests and streams AI-generated responses back to the client. It converts UI messages to model messages, processes them through the AI model, and returns a streamed response suitable for real-time chat interfaces.

```APIDOC
## POST /api/chat

### Description
Handles chat message requests and streams AI-generated text responses back to the client in real-time. This endpoint accepts a conversation history, converts it to the appropriate format for the AI model, and returns a streaming response.

### Method
POST

### Endpoint
`/api/chat`

### Parameters

#### Request Body
- **messages** (UIMessage[]) - Required - Array of message objects containing the conversation history between the user and the chatbot. UIMessage type includes message content and metadata such as timestamps and sender information.

### Request Example
```json
{
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "Hello, how are you?",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "id": "msg_2",
      "role": "assistant",
      "content": "I'm doing well, thank you!",
      "timestamp": "2024-01-15T10:30:05Z"
    }
  ]
}
```

### Implementation Details

#### Function Workflow
1. **Extract Messages**: Parse the incoming request body to extract the `messages` array of type `UIMessage[]`
2. **Convert Message Format**: Use `convertToModelMessages()` to transform `UIMessage[]` (with metadata) to `ModelMessage[]` (without metadata) format expected by the AI model
3. **Stream Text Generation**: Call `streamText()` with model configuration and converted messages
4. **Return Stream**: Convert the result to a UI message stream response using `toUIMessageStreamResponse()`

#### Code Example
```typescript
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'openai/gpt-5.1',
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

### Response

#### Success Response (200)
- Returns a streaming response object that sends AI-generated text in real-time
- Response type: `StreamTextResult` converted to UI message stream format
- Content-Type: `text/event-stream` or similar streaming format

#### Response Stream Format
The response is streamed incrementally as the AI generates text, allowing for real-time display in the UI.

### Model Configuration

#### Default Provider (Vercel AI Gateway)
```typescript
model: 'openai/gpt-5.1'
```

#### Alternative Gateway Provider Imports
```typescript
// Option 1: Import from 'ai' package (included by default)
import { gateway } from 'ai';
model: gateway('openai/gpt-5.1');

// Option 2: Import from '@ai-sdk/gateway' package
import { gateway } from '@ai-sdk/gateway';
model: gateway('openai/gpt-5.1');
```

#### Using OpenAI Provider Directly
```typescript
import { openai } from '@ai-sdk/openai';

model: openai('gpt-5.1');
```

### Message Types

#### UIMessage
- Used in application UI
- Contains full message history and metadata (timestamps, sender info, etc.)
- Type: `UIMessage[]`

#### ModelMessage
- Used for AI model input
- Stripped of UI-specific metadata
- Contains only essential message content
- Type: `ModelMessage[]`

#### Type Conversion
Use `convertToModelMessages()` function to convert between types:
```typescript
const modelMessages = convertToModelMessages(uiMessages);
```

### Additional Configuration Options
The `streamText()` function accepts additional settings to customize model behavior:
- Temperature
- Max tokens
- Top P
- Frequency penalty
- Presence penalty
- Stop sequences

Refer to the AI SDK Core settings documentation for complete configuration options.

### Requirements
- Next.js 13 or higher
- App Router (recommended for Web APIs support and streaming)
- AI SDK package installed
- Valid API keys for chosen model provider

### Notes
- Route Handlers can be used alongside Pages Router in Next.js 13+
- Streaming is recommended for better user experience with real-time responses
- The endpoint uses Web APIs interface for better compatibility
```

--------------------------------

### useCompletion Hook API

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/use-completion

Details on how to import and use the `useCompletion` hook across different frameworks, along with its available parameters.

```APIDOC
## `useCompletion()` Hook API

This hook allows you to create text completion based capabilities for your application. It enables the streaming of text completions from your AI provider, manages the state for chat input, and updates the UI automatically as new messages are received.

### Import

**React:**
```javascript
import { useCompletion } from '@ai-sdk/react';
```

**Svelte:**
```javascript
import { Completion } from '@ai-sdk/svelte';
```

**Vue:**
```javascript
import { useCompletion } from '@ai-sdk/vue';
```

### Parameters

- **api** (string, optional, default: `'/api/completion'`) - The API endpoint that is called to generate text. It can be a relative path (starting with `/`) or an absolute URL.
- **id** (string, optional) - An unique identifier for the completion. If not provided, a random one will be generated. When provided, the `useCompletion` hook with the same `id` will have shared states across components. This is useful when you have multiple components showing the same chat stream.
- **initialInput** (string, optional) - An optional string for the initial prompt input.
- **initialCompletion** (string, optional) - An optional string for the initial completion result.
- **onFinish** ((prompt: string, completion: string) => void, optional) - An optional callback function that is called when the completion stream ends.
- **onError** ((error: Error) => void, optional) - An optional callback that will be called when the chat stream encounters an error.
- **headers** (Record<string, string> | Headers, optional) - An optional object of headers to be passed to the API endpoint.
- **body** (any, optional) - An optional, additional body object to be passed to the API endpoint.
- **credentials** ('omit' | 'same-origin' | 'include', optional, default: 'same-origin') - An optional literal that sets the mode of credentials to be used on the request.
- **streamProtocol** ('text' | 'data', optional) - An optional literal that sets the type of stream to be used. Defaults to `data`. If set to `text`, the stream will be treated as a text stream.
- **fetch** (FetchFunction, optional) - Optional. A custom fetch function to be used for the API call. Defaults to the global fetch function.
- **experimental_throttle** (number, optional) - React only. Custom throttle wait time in milliseconds for the completion and data updates. When specified, throttles how often the UI updates during streaming. Default is undefined, which disables throttling.

### Request Example (Conceptual)

```json
{
  "prompt": "What is the weather like today?",
  "model": "gpt-3.5-turbo",
  "max_tokens": 50
}
```

### Response Example (Conceptual Stream)

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion.chunk",
  "created": 1677729598,
  "model": "gpt-3.5-turbo-0301",
  "choices": [
    {
      "delta": {
        "content": "The weather today is"
      },
      "index": 0,
      "finish_reason": null
    }
  ]
}
```
```

--------------------------------

### Configure AI Model with `gateway` Function from 'ai' Package

Source: https://v6.ai-sdk.dev/docs/getting-started/svelte

Demonstrates how to explicitly use the `gateway` function, imported from the main `ai` package, to configure an AI model. This provides a clear way to reference models through the Vercel AI Gateway.

```ts
import { gateway } from 'ai';
model: gateway('openai/gpt-5.1');
```

--------------------------------

### Handle AI_NoTranscriptGeneratedError in Transcription

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/transcription

Provides an example of how to catch and handle `AI_NoTranscriptGeneratedError`, which is thrown when the transcription model fails to produce a valid transcript. It shows how to access error details like `cause` and `responses`.

```typescript
import {
  experimental_transcribe as transcribe,
  NoTranscriptGeneratedError,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFile } from 'fs/promises';

try {
  await transcribe({
    model: openai.transcription('whisper-1'),
    audio: await readFile('audio.mp3'),
  });
} catch (error) {
  if (NoTranscriptGeneratedError.isInstance(error)) {
    console.log('NoTranscriptGeneratedError');
    console.log('Cause:', error.cause);
    console.log('Responses:', error.responses);
  }
}
```

--------------------------------

### Generate Text with AI SDK ToolLoopAgent

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent

This TypeScript snippet demonstrates how to use the `generate()` method of an AI SDK `ToolLoopAgent` to get a single response. It sends a prompt and returns a promise resolving to a `GenerateTextResult` object, potentially triggering tool calls.

```typescript
const result = await agent.generate({
  prompt: 'What is the weather like?',
});
```

--------------------------------

### Stream Structured Output from AI SDK ToolLoopAgent

Source: https://v6.ai-sdk.dev/docs/introduction/announcing-ai-sdk-6-beta

This example illustrates how to stream structured output using the `agent.stream()` method in AI SDK. It configures a `ToolLoopAgent` with specific instructions and an `Output.object` schema for generating person profiles, then iterates over the `partialOutputStream` to display incremental updates as the structured data is being generated.

```typescript
import { ToolLoopAgent, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';


const profileAgent = new ToolLoopAgent({
  model: openai('gpt-5-mini'),
  instructions: 'Generate realistic person profiles.',
  output: Output.object({
    schema: z.object({
      name: z.string(),
      age: z.number(),
      occupation: z.string(),
    }),
  }),
});


const { partialOutputStream } = await profileAgent.stream({
  prompt: 'Generate a person profile.',
});


for await (const partial of partialOutputStream) {
  console.log(partial);
}
```

--------------------------------

### Initialize MCP Client with Stdio Transport

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

Details on setting up the MCP client with Stdio transport, exclusively for local development environments to connect to MCP servers running locally via standard I/O streams.

```APIDOC
## SDK Function: `experimental_createMCPClient`

### Description
Initializes an MCP client using Stdio transport. This transport is exclusively for connecting to local MCP servers during development, utilizing standard input/output streams.

### Function Signature
`experimental_createMCPClient(config: MCPClientConfig)`

### Configuration Object (`MCPClientConfig`)
- **transport** (object) - Required - Configuration for the Stdio transport layer.
  - **StdioClientTransport** (class instance) - Required - An instance of `StdioClientTransport` from `@modelcontextprotocol/sdk/client/stdio.js` or `@ai-sdk/mcp/mcp-stdio`.
    - **command** (string) - Required - The command to execute the local MCP server, e.g., `'node'`.
    - **args** (array<string>) - Optional - An array of arguments to pass to the command, e.g., `['src/stdio/dist/server.js']`.

### Example Usage
```typescript
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
// Or use the AI SDK's stdio transport:
// import { Experimental_StdioMCPTransport as StdioClientTransport } from '@ai-sdk/mcp/mcp-stdio';

const mcpClient = await createMCPClient({
  transport: new StdioClientTransport({
    command: 'node',
    args: ['src/stdio/dist/server.js'],
  }),
});
```

### Return Value
- **mcpClient** (object) - An instance of the configured MCP client.
```

--------------------------------

### Convert StringOutputParser Stream to Data Stream Response

Source: https://v6.ai-sdk.dev/docs/reference/stream-helpers/langchain-adapter

Illustrates converting a LangChain stream that uses StringOutputParser to a UI message stream response. This example pipes the model output through `StringOutputParser` before streaming, using `toUIMessageStream` for compatibility.

```typescript
import {
  toUIMessageStream,
} from '@ai-sdk/langchain';
import {
  StringOutputParser,
} from '@langchain/core/output_parsers';
import {
  ChatOpenAI,
} from '@langchain/openai';
import {
  createUIMessageStreamResponse,
} from 'ai';

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const model = new ChatOpenAI({
    model: 'gpt-3.5-turbo-0125',
    temperature: 0,
  });

  const parser = new StringOutputParser();

  const stream = await model.pipe(parser).stream(prompt);

  return createUIMessageStreamResponse({
    stream: toUIMessageStream(stream),
  });
}
```

--------------------------------

### Instantiate and Use ToolLoopAgent with Tools (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent

This code demonstrates how to initialize a `ToolLoopAgent` with a specified model, instructions, and a set of tools. It then shows how to use the agent to process a prompt and retrieve the generated text, leveraging its multi-step reasoning capabilities for complex interactions.

```typescript
import { ToolLoopAgent } from 'ai';

const agent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  instructions: 'You are a helpful assistant.',
  tools: {
    weather: weatherTool,
    calculator: calculatorTool,
  },
});

const result = await agent.generate({
  prompt: 'What is the weather in NYC?',
});

console.log(result.text);
```

--------------------------------

### Integrate a Tool with generateText in AI SDK

Source: https://v6.ai-sdk.dev/docs/foundations/tools

This TypeScript example shows how to pass a ready-made tool, `searchTool`, to the `generateText` function. The LLM can then invoke this tool for specific tasks like web searching, and its output is considered in the LLM's subsequent response, potentially in multi-step calls.

```typescript
import { generateText, stepCountIs } from 'ai';
import { searchTool } from 'some-tool-package';

const { text } = await generateText({
  model: 'anthropic/claude-haiku-4.5',
  prompt: 'When was Vercel Ship AI?',
  tools: {
    webSearch: searchTool,
  },
  stopWhen: stepCountIs(10),
});
```

--------------------------------

### Create a ToolLoopAgent with Multiple Tools - TypeScript

Source: https://v6.ai-sdk.dev/docs/agents/overview

This example demonstrates how to create a ToolLoopAgent in TypeScript. The agent is configured with an LLM model and multiple tools (weather and temperature conversion). It automatically orchestrates the execution of these tools to answer a user's prompt, handling context management and stopping conditions internally.

```typescript
import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { z } from 'zod';

const weatherAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  tools: {
    weather: tool({
      description: 'Get the weather in a location (in Fahrenheit)',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
    convertFahrenheitToCelsius: tool({
      description: 'Convert temperature from Fahrenheit to Celsius',
      inputSchema: z.object({
        temperature: z.number().describe('Temperature in Fahrenheit'),
      }),
      execute: async ({ temperature }) => {
        const celsius = Math.round((temperature - 32) * (5 / 9));
        return { celsius };
      },
    }),
  },
  // Agent's default behavior is to stop after a maximum of 20 steps
  // stopWhen: stepCountIs(20),
});

const result = await weatherAgent.generate({
  prompt: 'What is the weather in San Francisco in celsius?',
});

console.log(result.text); // agent's final answer
console.log(result.steps); // steps taken by the agent

```

--------------------------------

### Generate Text with xAI Grok Model using AI SDK

Source: https://v6.ai-sdk.dev/docs/index

Demonstrates how to use the AI SDK to generate text responses using xAI's Grok-4 model. The generateText function takes a model configuration and prompt, returning generated text. This example shows the standardized API that works across different AI providers.

```typescript
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

const { text } = await generateText({
  model: xai("grok-4"),
  prompt: "What is love?"
})
```

--------------------------------

### useChat: Stream Resumption Only (No Abort)

Source: https://v6.ai-sdk.dev/docs/troubleshooting/abort-breaks-resumable-streams

This configuration of useChat prioritizes stream resumption. It is suitable for long-running generations that need to persist across page reloads. The abort functionality is implicitly disabled in this setup.

```tsx
const { messages, sendMessage } = useChat({
  id: chatId,
  resume: true,
});
```

--------------------------------

### Inspecting AI Model Call Warnings

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompt-engineering

This code snippet demonstrates how to retrieve and inspect warnings associated with an AI model call. Warnings are returned by providers when certain features or settings are not supported, helping to debug compatibility issues between your prompt, tools, and the provider's capabilities.

```typescript
const result = await generateText({
  model: openai('gpt-5-mini'),
  prompt: 'Hello, world!',
});

console.log(result.warnings);
```

--------------------------------

### Specify Image Size for Generation with OpenAI DALL-E 3

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/image-generation

This example illustrates how to set a specific size for the generated image using the `size` parameter. The size is provided as a string in the format '{width}x{height}', and supported sizes vary by model and provider.

```tsx
import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Santa Claus driving a Cadillac',
  size: '1024x1024',
});
```

--------------------------------

### Define an AI Tool with Type-Inferred Input (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool

This example demonstrates how to define an AI tool using the `tool()` helper from the `ai` SDK. It utilizes Zod to define the `inputSchema`, allowing TypeScript to automatically infer the types of the arguments passed to the `execute` method, such as `location` in this weather tool.

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  // location below is inferred to be a string:
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});
```

--------------------------------

### Enable Telemetry in AI SDK (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/telemetry

Enables telemetry for a specific function call using the `experimental_telemetry` option. Telemetry collection is managed via OpenTelemetry. Ensure Next.js OpenTelemetry guide is followed for Next.js applications.

```typescript
const result = await generateText({
  model: openai('gpt-4.1'),
  prompt: 'Write a short story about a cat.',
  experimental_telemetry: { isEnabled: true },
});
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

--------------------------------

### Request-Level Configuration for useChat

Source: https://v6.ai-sdk.dev/docs/troubleshooting/use-chat-custom-request-options

This example shows the recommended method for dynamic request options by passing them directly to the `sendMessage` function. This allows for up-to-date values like authentication tokens and user IDs on a per-request basis.

```tsx
const { messages, sendMessage } = useChat();

sendMessage(
  { text: input },
  {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`, // Dynamic auth token
      'X-Request-ID': generateRequestId(),
    },
    body: {
      temperature: 0.7,
      max_tokens: 100,
      user_id: getCurrentUserId(), // Dynamic user ID
      sessionId: getCurrentSessionId(), // Dynamic session
    },
  },
);
```

--------------------------------

### Define StepStartUIPart TypeScript Type

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/ui-message

Defines the TypeScript type for a step start UI part. This type is used within message structures to indicate the beginning of a new step. It has a single property 'type' with a literal value 'step-start'.

```typescript
type StepStartUIPart = {
  type: 'step-start';
};
```

--------------------------------

### Create Chat Interface Component with useChat Hook in Next.js

Source: https://v6.ai-sdk.dev/docs/getting-started/nextjs-pages-router

Implements a complete chat interface using the AI SDK's useChat hook. The component displays a list of chat messages with different parts (text, reasoning tokens), handles user input through a controlled form, and automatically communicates with the /api/chat endpoint. The messages array contains objects with id, role, and parts properties, while sendMessage function handles message submission.

```tsx
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(message => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <div key={`${message.id}-${i}`}>{part.text}</div>;
            }
          })}
        </div>
      ))}

      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={e => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
```

--------------------------------

### Set Timeout for Speech Generation using AbortSignal

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/speech

This example demonstrates how to use an `AbortSignal` with `AbortSignal.timeout()` to cancel the speech generation process after a specified duration. This is crucial for managing long-running operations and preventing indefinite hangs.

```typescript
import { openai } from '@ai-sdk/openai';
import { experimental_generateSpeech as generateSpeech } from 'ai';

const audio = await generateSpeech({
  model: openai.speech('tts-1'),
  text: 'Hello, world!',
  abortSignal: AbortSignal.timeout(1000), // Abort after 1 second
});
```

--------------------------------

### Customizing Separator in Provider Registry - TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/provider-registry

This example illustrates how to customize the separator used in model IDs within the provider registry. By default, it's a colon (:), but this code shows setting it to ' > ' for clearer differentiation.

```TypeScript
const registry = createProviderRegistry(
  {
    anthropic,
    openai,
  },
  { separator: ' > ' },
);

// Now you can use the custom separator
const model = registry.languageModel('anthropic > claude-3-opus-20240229');
```

--------------------------------

### Define Basic Assistant Text Message in AI SDK (JavaScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

This example shows how to construct a simple assistant message containing plain text content. Assistant messages typically represent responses from the AI model and are included in the `messages` array passed to `generateText`. This format is straightforward for basic conversational turns.

```javascript
const result = await generateText({
  model: 'openai/gpt-4.1',
  messages: [
    { role: 'user', content: 'Hi!' },
    { role: 'assistant', content: 'Hello, how can I help?' },
  ],
});
```

--------------------------------

### Abort Image Generation or Set Timeout with AbortSignal

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/image-generation

This example demonstrates how to use an `AbortSignal` with `generateImage` to either abort the generation process or set a timeout. Here, `AbortSignal.timeout(1000)` is used to automatically cancel the image generation after 1 second.

```ts
import { openai } from '@ai-sdk/openai';
import { experimental_generateImage as generateImage } from 'ai';

const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Santa Claus driving a Cadillac',
  abortSignal: AbortSignal.timeout(1000), // Abort after 1 second
});
```

--------------------------------

### Navigate to Project Directory

Source: https://v6.ai-sdk.dev/docs/guides/multi-modal-chatbot

Use this command to change the current working directory to the newly created 'multi-modal-agent' folder, allowing you to execute subsequent project-specific commands.

```bash
cd multi-modal-agent
```

--------------------------------

### Handle Dynamic and Static Tools Type-Safely (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/dynamic-tool

This example illustrates how to use `dynamicTool` alongside static tools and differentiate them using the `dynamic` flag within the `onStepFinish` callback. It demonstrates type narrowing for both dynamic (unknown types) and static (inferred types) tool calls, ensuring proper handling based on their nature.

```ts
const result = await generateText({
  model: openai('gpt-4'),
  tools: {
    // Static tool with known types
    weather: weatherTool,
    // Dynamic tool with unknown types
    custom: dynamicTool({
      /* ... */
    }),
  },
  onStepFinish: ({ toolCalls, toolResults }) => {
    for (const toolCall of toolCalls) {
      if (toolCall.dynamic) {
        // Dynamic tool: input/output are 'unknown'
        console.log('Dynamic tool:', toolCall.toolName);
        console.log('Input:', toolCall.input);
        continue;
      }

      // Static tools have full type inference
      switch (toolCall.toolName) {
        case 'weather':
          // TypeScript knows the exact types
          console.log(toolCall.input.location); // string
          break;
      }
    }
  },
});
```

--------------------------------

### Implement Custom AI SDK Warning Handler

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/error-handling

This example shows how to implement a custom warning handler for the AI SDK. By assigning a function to `globalThis.AI_SDK_LOG_WARNINGS`, you can process warnings in a personalized way, such as logging them with custom prefixes or triggering specific UI updates.

```typescript
globalThis.AI_SDK_LOG_WARNINGS = warnings => {
  // Handle warnings your own way
  warnings.forEach(warning => {
    // Your custom logic here
    console.log('Custom warning:', warning);
  });
};
```

--------------------------------

### Specify Language for Speech Generation (Lmnt)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/speech

This example shows how to set a specific language for speech generation using the `lmnt` provider. Ensure the provider supports the specified language code. The generated audio data can be accessed via the `.audioData` property.

```typescript
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { lmnt } from '@ai-sdk/lmnt';

const audio = await generateSpeech({
  model: lmnt.speech('aurora'),
  text: 'Hola, mundo!',
  language: 'es', // Spanish
});

const audioData = audio.audioData; // audio data e.g. Uint8Array
```

--------------------------------

### Migrate Tool Result Content from experimental_toToolResultContent to toModelOutput in AI SDK

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This example demonstrates updating the tool definition's result content transformation. `experimental_toToolResultContent` has been renamed to `toModelOutput` in AI SDK v5 and is no longer considered experimental, with an updated structure for the return value.

```tsx
const screenshotTool = tool({
  description: 'Take a screenshot',
  parameters: z.object({}),
  execute: async () => {
    const imageData = await takeScreenshot();
    return imageData; // base64 string
  },
  experimental_toToolResultContent: result => [{ type: 'image', data: result }],
});
```

```tsx
const screenshotTool = tool({
  description: 'Take a screenshot',
  inputSchema: z.object({}),
  execute: async () => {
    const imageData = await takeScreenshot();
    return imageData;
  },
  toModelOutput: result => ({
    type: 'content',
    value: [{ type: 'media', mediaType: 'image/png', data: result }],
  }),
});
```

--------------------------------

### List Resources from MCP Server (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

Lists all available resources from the MCP server. This method accepts an optional `options` object. It supports optional `params` for pagination, including a cursor, and general `options` for the request like signal and timeout.

```typescript
async (options?: { params?: PaginatedRequest['params']; options?: RequestOptions; }) => Promise<ListResourcesResult>
```

--------------------------------

### Infer AI SDK Agent UI Message Type

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent

This TypeScript example shows how to use `InferAgentUIMessage` to infer the UI message type for a specific `ToolLoopAgent` instance. This is useful for ensuring type safety when exchanging messages in a user interface context.

```typescript
import { ToolLoopAgent, InferAgentUIMessage } from 'ai';

const weatherAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  tools: { weather: weatherTool },
});

type WeatherAgentUIMessage = InferAgentUIMessage<typeof weatherAgent>;
```

--------------------------------

### Add Dynamic User Context to AI Agent Prompts (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/configuring-call-options

This example demonstrates how to use `callOptionsSchema` and `prepareCall` to dynamically inject user-specific context (like `userId` and `accountType`) into an AI agent's instructions. It ensures the agent's response is tailored based on the user's account level.

```ts
import { ToolLoopAgent } from 'ai';
import { z } from 'zod';

const supportAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  callOptionsSchema: z.object({
    userId: z.string(),
    accountType: z.enum(['free', 'pro', 'enterprise']),
  }),
  instructions: 'You are a helpful customer support agent.',
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions:
      settings.instructions +
      `\nUser context:\n- Account type: ${options.accountType}\n- User ID: ${options.userId}\n\nAdjust your response based on the user's account level.`,
  }),
});

// Call the agent with specific user context
const result = await supportAgent.generate({
  prompt: 'How do I upgrade my account?',
  options: {
    userId: 'user_123',
    accountType: 'free',
  },
});
```

--------------------------------

### Add AI SDK 3.1 Package

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-3-1

Command to update the AI SDK to version 3.1 using pnpm. This is the first step in upgrading to the latest version.

```bash
pnpm add ai@3.1
```

--------------------------------

### Rerank String Documents with AI SDK and Cohere

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/rerank

This example demonstrates how to use the `rerank` function to reorder an array of string documents based on a query. It utilizes a Cohere reranking model and logs both the `ranking` array (with scores and original indices) and the `rerankedDocuments` array.

```ts
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking, rerankedDocuments } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: [
    'sunny day at the beach',
    'rainy afternoon in the city',
    'snowy night in the mountains',
  ],
  query: 'talk about rain',
  topN: 2,
});

console.log(rerankedDocuments);
// ['rainy afternoon in the city', 'sunny day at the beach']

console.log(ranking);
// [
//   { originalIndex: 1, score: 0.9, document: 'rainy afternoon...' },
//   { originalIndex: 0, score: 0.3, document: 'sunny day...' }
// ]
```

--------------------------------

### Define Multi-modal Tool Output with toModelOutput (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages

This example illustrates how to create a tool with the optional `toModelOutput` method to handle multi-modal content, such as images, within `convertToModelMessages`. This allows tools to return non-textual data, enhancing the capabilities of AI interactions.

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const screenshotTool = tool({
  parameters: z.object({}),
  execute: async () => 'imgbase64',
  toModelOutput: result => [{ type: 'image', data: result }],
});

const result = streamText({
  model: openai('gpt-4'),
  messages: convertToModelMessages(messages, {
    tools: {
      screenshot: screenshotTool,
    },
  }),
});
```

--------------------------------

### Create Customizable ID Generator with Prefix and Separator (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-id-generator

Demonstrates how to use `createIdGenerator` to create a custom ID generator. This example configures a prefix 'user' and a separator '_', then generates an ID. The function takes an options object to customize ID generation.

```typescript
import { createIdGenerator } from 'ai';

const generateCustomId = createIdGenerator({
  prefix: 'user',
  separator: '_',
});

const id = generateCustomId(); // Example: "user_1a2b3c4d5e6f7g8h"
```

--------------------------------

### Control Agent Output Format and Style (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/building-agents

This snippet demonstrates how to instruct an agent to adhere to specific formatting and communication styles. It sets guidelines for a technical writer agent, including clarity, jargon avoidance, structural elements, and the requirement to format responses in Markdown.

```ts
const technicalWriterAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  instructions: `You are a technical documentation writer.

  Writing style:
  - Use clear, simple language
  - Avoid jargon unless necessary
  - Structure information with headers and bullet points
  - Include code examples where relevant
  - Write in second person ("you" instead of "the user")

  Always format responses in Markdown.`,
});
```

--------------------------------

### Forwarding StreamText Errors to UI with getErrorMessage (TypeScript)

Source: https://v6.ai-sdk.dev/docs/troubleshooting/use-chat-an-error-occurred

This example demonstrates how to use the `getErrorMessage` option within `toUIMessageStreamResponse` to forward custom error details from `streamText` to the UI. It utilizes the `errorHandler` function defined previously.

```tsx
const result = streamText({
  // ...
});

return result.toUIMessageStreamResponse({
  getErrorMessage: errorHandler,
});
```

--------------------------------

### List Resource Templates from MCP Server (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

Lists all available resource templates from the MCP server. This method accepts an optional `options` object for the request, allowing configuration for signal and timeout.

```typescript
async (options?: { options?: RequestOptions; }) => Promise<ListResourceTemplatesResult>
```

--------------------------------

### Generate API URLs for Expo Development and Production Environments

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

Creates a utility function that generates appropriate API URLs for different environments in Expo applications. Handles URL formatting for both development (using expo-constants) and production (using environment variables) scenarios. Throws an error if the required EXPO_PUBLIC_API_BASE_URL environment variable is missing in production.

```typescript
import Constants from 'expo-constants';

export const generateAPIUrl = (relativePath: string) => {
  const origin = Constants.experienceUrl.replace('exp://', 'http://');

  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  if (process.env.NODE_ENV === 'development') {
    return origin.concat(path);
  }

  if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL environment variable is not defined',
    );
  }

  return process.env.EXPO_PUBLIC_API_BASE_URL.concat(path);
};
```

--------------------------------

### Example: Deleting a previously logged meal with AI SDK

Source: https://v6.ai-sdk.dev/docs/advanced/multistep-interfaces

Illustrates a multistep interaction where the AI SDK uses application context to delete a meal previously logged. It shows how the model references past interactions to correctly invoke the 'delete_meal' tool, demonstrating context management in sequential user requests.

```text
User: Log a chicken shawarma for lunch.
Tool: log_meal("chicken shawarma", "250g", "12:00 PM")
Model: Chicken shawarma has been logged for lunch.
...
...
User: I skipped lunch today, can you update my log?
Tool: delete_meal("chicken shawarma")
Model: Chicken shawarma has been deleted from your log.
```

--------------------------------

### Generate Text with OpenAI Model using ai-sdk

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/generate-text

Demonstrates how to use the `generateText` function from the `@ai-sdk/openai` and `ai` libraries to create text. It imports necessary modules, calls `generateText` with a specified `gpt-5-mini` model and a creative prompt, and logs the generated text to the console.

```ts
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const { text } = await generateText({
  model: openai('gpt-5-mini'),
  prompt: 'Invent a new holiday and describe its traditions.',
});

console.log(text);
```

--------------------------------

### Generate Array with Item Schema

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/generate-object

Generates an array of objects by specifying the schema for individual array items rather than the array itself. This example generates multiple hero character descriptions with defined properties for name, class, and description.

```typescript
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: openai('gpt-4.1'),
  output: 'array',
  schema: z.object({
    name: z.string(),
    class: z
      .string()
      .describe('Character class, e.g. warrior, mage, or thief.'),
    description: z.string(),
  }),
  prompt: 'Generate 3 hero descriptions for a fantasy role playing game.',
});
```

--------------------------------

### Create AI Context with createAI

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/generative-ui-state

Initializes the AI context using the `createAI` function. It requires defining the AI and UI state types, initial states, and the server actions that can be performed.

```tsx
import { createAI } from '@ai-sdk/rsc';
import { ClientMessage, ServerMessage, sendMessage } from './actions';

export type AIState = ServerMessage[];
export type UIState = ClientMessage[];

export const AI = createAI<AIState, UIState>({
  initialAIState: [],
  initialUIState: [],
  actions: {
    sendMessage,
  },
});
```

--------------------------------

### Update UI integration imports for Svelte (TypeScript)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-4-0

The AI SDK no longer exports Svelte UI integrations directly from the main `ai` package. For Svelte integration, you now need to install and import from the dedicated `@ai-sdk/svelte` package. This change modularizes UI framework integrations.

```typescript
import { useChat } from 'ai/svelte';
```

```typescript
import { useChat } from '@ai-sdk/svelte';
```

--------------------------------

### MCPClient.listResourceTemplates() - List Resource Templates

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

Lists all available resource templates from the MCP server. Resource templates define patterns for accessing resources dynamically.

```APIDOC
## listResourceTemplates()

### Description
Lists all available resource templates from the MCP server.

### Method
Async

### Signature
```typescript
async (options?: {
  options?: RequestOptions;
}) => Promise<ListResourceTemplatesResult>
```

### Parameters
#### Options (Optional)
- **options** (RequestOptions) - Optional - Request options including signal and timeout.

### Returns
Promise<ListResourceTemplatesResult> - A promise that resolves to the list of resource templates.

### Example Usage
```typescript
const templates = await client.listResourceTemplates();

// With request options
const templates = await client.listResourceTemplates({
  options: { timeout: 5000 }
});
```
```

--------------------------------

### Define Custom OpenAI Provider with Custom Settings - TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/custom-provider

This example demonstrates how to create a custom OpenAI provider using `customProvider`. It shows how to override default model settings for specific models like 'gpt-4' and create aliased models with custom configurations, such as 'gpt-5-mini-reasoning-high', by applying middleware. It also specifies a fallback provider.

```typescript
import {
  openai
} from '@ai-sdk/openai';
import {
  customProvider,
  wrapLanguageModel,
  defaultSettingsMiddleware
} from 'ai';

// custom provider with different model settings:
export const myOpenAI = customProvider({
  languageModels: {
    // replacement model with custom settings:
    'gpt-4': wrapLanguageModel({
      model: openai('gpt-4'),
      middleware: defaultSettingsMiddleware({
        settings: {
          providerOptions: {
            openai: {
              reasoningEffort: 'high',
            },
          },
        },
      }),
    }),
    // alias model with custom settings:
    'gpt-5-mini-reasoning-high': wrapLanguageModel({
      model: openai('gpt-5-mini'),
      middleware: defaultSettingsMiddleware({
        settings: {
          providerOptions: {
            openai: {
              reasoningEffort: 'high',
            },
          },
        },
      }),
    }),
  },
  fallbackProvider: openai,
});
```

--------------------------------

### Verify Data Migration with TypeScript

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0-data

This script counts messages in both the old (v4) and new (v5) schemas to verify data integrity after migration. It logs the counts and calculates the migration progress percentage. Ensure you have drizzle-orm installed and your database connection configured.

```typescript
import { count } from 'drizzle-orm';
import { db } from './db';
import { messages, messages_v5 } from './db/schema';

async function verifyMigration() {
  // Count messages in both schemas
  const v4Count = await db.select({ count: count() }).from(messages);
  const v5Count = await db.select({ count: count() }).from(messages_v5);

  console.log('Migration Status:');
  console.log(`V4 Messages: ${v4Count[0].count}`);
  console.log(`V5 Messages: ${v5Count[0].count}`);
  console.log(
    `Migration progress: ${((v5Count[0].count / v4Count[0].count) * 100).toFixed(2)}%`,
  );
}

verifyMigration().catch(console.error);
```

--------------------------------

### Update Streaming Protocol to Start/Delta/End Pattern (AI SDK v5)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

AI SDK v5 redefines its streaming protocol from single, undifferentiated chunks to a more robust three-phase `start`/`delta`/`end` pattern for each content block. This change introduces unique IDs for blocks, enabling better content differentiation and concurrent streaming, and changes `textDelta` to `delta`.

```tsx
for await (const chunk of result.fullStream) {
  switch (chunk.type) {
    case 'text-delta': {
      process.stdout.write(chunk.textDelta);
      break;
    }
  }
}
```

```tsx
for await (const chunk of result.fullStream) {
  switch (chunk.type) {
    case 'text-start': {
      // New: Initialize a text block with unique ID
      console.log(`Starting text block: ${chunk.id}`);
      break;
    }
    case 'text-delta': {
      // Changed: Now includes ID and uses 'delta' property
      process.stdout.write(chunk.delta); // Changed from 'textDelta'
      break;
    }
    case 'text-end': {
      // New: Finalize the text block
      console.log(`Completed text block: ${chunk.id}`);
      break;
    }
  }
}
```

--------------------------------

### Implement ToolLoopAgent with OpenAI and Custom Tool

Source: https://v6.ai-sdk.dev/docs/introduction/announcing-ai-sdk-6-beta

This code demonstrates how to instantiate a `ToolLoopAgent` using the AI SDK 6. It configures the agent with an OpenAI model, specific instructions, and a custom 'weather' tool, then shows how to invoke it with a prompt. The `ToolLoopAgent` automatically manages the execution flow, including LLM calls and tool execution.

```typescript
import { openai } from '@ai-sdk/openai';
import { ToolLoopAgent } from 'ai';
import { weatherTool } from '@/tool/weather';


export const weatherAgent = new ToolLoopAgent({
  model: openai('gpt-5-mini'),
  instructions: 'You are a helpful weather assistant.',
  tools: {
    weather: weatherTool,
  },
});


// Use the agent
const result = await weatherAgent.generate({
  prompt: 'What is the weather in San Francisco?',
});
```

--------------------------------

### Create API Response for Agent UI Stream (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/building-agents

This example demonstrates how to integrate an agent into an API route (e.g., Next.js API route) to handle UI messages. It uses `createAgentUIStreamResponse` from `ai` to create a streaming response suitable for client-side applications that expect a continuous data flow.

```ts
// In your API route (e.g., app/api/chat/route.ts)
import { createAgentUIStreamResponse } from 'ai';

export async function POST(request: Request) {
  const { messages } = await request.json();

  return createAgentUIStreamResponse({
    agent: myAgent,
    messages,
  });
}
```

--------------------------------

### Update Provider Metadata to Provider Options in AI SDK

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This example illustrates the change in AI SDK from using `providerMetadata` as an input parameter to `providerOptions` when generating text. Note that the returned metadata from results still uses the `providerMetadata` property.

```tsx
const result = await generateText({
  model: openai('gpt-4'),
  prompt: 'Hello',
  providerMetadata: {
    openai: { store: false },
  },
});
```

```tsx
const result = await generateText({
  model: openai('gpt-4'),
  prompt: 'Hello',
  providerOptions: {
    // Input parameter renamed
    openai: { store: false },
  },
});

// Returned metadata still uses providerMetadata:
console.log(result.providerMetadata?.openai);
```

--------------------------------

### Classify Text Server (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/object-generation

Server-side API route for text classification using `streamObject` with `output: 'enum'`. It takes context, specifies the model, and an array of possible enum values. The prompt guides the AI to classify the input statement.

```typescript
import { openai } from '@ai-sdk/openai';
import { streamObject } from 'ai';

export async function POST(req: Request) {
  const context = await req.json();

  const result = streamObject({
    model: openai('gpt-4.1'),
    output: 'enum',
    enum: ['true', 'false'],
    prompt: `Classify this statement as true or false: ${context}`,
  });

  return result.toTextStreamResponse();
}
```

--------------------------------

### AI SDK Configuration Parameters

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-rsc/render

Configuration options for the AI SDK, including model selection, provider, initial UI, message history, and available tools.

```APIDOC
## AI SDK Configuration

### Description
This section details the parameters used to configure the AI SDK for various functionalities.

### Method
N/A (Configuration parameters)

### Endpoint
N/A

### Parameters
#### Request Body
- **model** (string) - Required - Model identifier, must be OpenAI SDK compatible.
- **provider** (provider client) - Required - Currently the only provider available is OpenAI. This needs to match the model name.
- **initial** (ReactNode) - Optional - The initial UI to render.
- **messages** (Array<SystemMessage | UserMessage | AssistantMessage | ToolMessage>) - Required - A list of messages that represent a conversation.
  - **SystemMessage**
    - **role** (string, literal: "system") - The role for the system message.
    - **content** (string) - The content of the message.
  - **UserMessage**
    - **role** (string, literal: "user") - The role for the user message.
    - **content** (string) - The content of the message.
  - **AssistantMessage**
    - **role** (string, literal: "assistant") - The role for the assistant message.
    - **content** (string) - The content of the message.
    - **tool_calls** (ToolCall[]) - Optional - A list of tool calls made by the model.
      - **ToolCall**
        - **id** (string) - The id of the tool call.
        - **type** (string, literal: "function") - The type of the tool call.
        - **function** (Function) - The function to call.
          - **Function**
            - **name** (string) - The name of the function.
            - **arguments** (string) - The arguments of the function.
  - **ToolMessage**
    - **role** (string, literal: "tool") - The role for the tool message.
    - **content** (string) - The content of the message.
    - **toolCallId** (string) - The id of the tool call.
- **functions** (ToolSet) - Optional - Tools that are accessible to and can be called by the model.
  - **Tool**
    - **description** (string) - Optional - Information about the purpose of the tool including details on how and when it can be used by the model.
    - **parameters** (zod schema) - Required - The typed schema that describes the parameters of the tool that can also be used to validation and error handling.
    - **render** (async (parameters) => any) - Optional - A renderer for the tool.

### Request Example
```json
{
  "model": "gpt-5-mini",
  "provider": "openai",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "functions": [
    {
      "description": "Get the current weather",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "The city and state, e.g. San Francisco, CA"
          }
        },
        "required": ["location"]
      },
      "render": async (params) => {
        // Your tool rendering logic here
        return `Weather for ${params.location}`;
      }
    }
  ]
}
```

### Response
#### Success Response (200)
- **message** (string) - A success message.
- **data** (object) - The response data.

#### Response Example
```json
{
  "message": "AI response generated successfully.",
  "data": {
    "content": "Hello there! How can I help you today?"
  }
}
```
```

--------------------------------

### Consume Streamable Value with useStreamableValue - React TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-rsc/use-streamable-value

Example of using the useStreamableValue hook in a React component. It takes a streamableValue prop and displays loading, error, or data states based on the hook's return values.

```tsx
function MyComponent({ streamableValue }) {
  const [data, error, pending] = useStreamableValue(streamableValue);

  if (pending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Data: {data}</div>;
}
```

--------------------------------

### Consume Agent UI Stream Output (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-agent-ui-stream

Provides an example of calling `createAgentUIStream` with a pre-configured agent and a user message. It then iterates asynchronously over the returned stream, processing each UI message chunk as it becomes available. This pattern is useful for logging, displaying incremental UI updates, or forwarding data to a client.

```typescript
import { createAgentUIStream } from 'ai';

const stream = await createAgentUIStream({
  agent,
  messages: [{ role: 'user', content: 'What is the weather in SF today?' }],
  sendStart: true,
});

for await (const chunk of stream) {
  // Process each UI message chunk (e.g., send to client)
  console.log(chunk);
}
```

--------------------------------

### MCPClient.listResources() - List Available Resources

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

Lists all available resources from the MCP server with optional pagination support. Allows passing pagination parameters and request options for controlling the request behavior.

```APIDOC
## listResources()

### Description
Lists all available resources from the MCP server with pagination support.

### Method
Async

### Signature
```typescript
async (options?: {
  params?: PaginatedRequest['params'];
  options?: RequestOptions;
}) => Promise<ListResourcesResult>
```

### Parameters
#### Options (Optional)
- **params** (PaginatedRequest['params']) - Optional - Pagination parameters including cursor for navigating through results.
- **options** (RequestOptions) - Optional - Request options including signal and timeout for request control.

### Returns
Promise<ListResourcesResult> - A promise that resolves to the list of available resources.

### Example Usage
```typescript
const resources = await client.listResources();

// With pagination
const resources = await client.listResources({
  params: { cursor: 'next-page-cursor' },
  options: { timeout: 5000 }
});
```
```

--------------------------------

### Optimize AI SDK Agentic Loops with Message Compression (TypeScript/TSX)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

This example showcases how the `prepareStep` callback can be used for advanced message modification, specifically for prompt compression in longer agentic loops. By slicing the `messages` array when it exceeds a certain length, it helps manage context window limits and improve performance by providing only recent conversation history to the model.

```tsx
prepareStep: async ({ stepNumber, steps, messages }) => {
  // Compress conversation history for longer loops
  if (messages.length > 20) {
    return {
      messages: messages.slice(-10),
    };
  }

  return {};
},
```

--------------------------------

### Generate Multiple Images with AI SDK and OpenAI DALL-E 2

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/image-generation

This example shows how to request multiple images in a single `generateImage` call using the `n` parameter. The AI SDK handles batching requests to the model, which is illustrated here by generating 4 images with DALL-E 2.

```tsx
import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

const { images } = await generateImage({
  model: openai.image('dall-e-2'),
  prompt: 'Santa Claus driving a Cadillac',
  n: 4, // number of images to generate
});
```

--------------------------------

### Import createStreamableValue in AI SDK (v4 vs v5)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This snippet shows the package change for 'createStreamableValue'. In AI SDK v4, it was exported from 'ai/rsc'. For v5, it has been extracted to a separate package, '@ai-sdk/rsc', requiring an update to the import path and package installation.

```tsx
import { createStreamableValue } from 'ai/rsc';
```

```tsx
import { createStreamableValue } from '@ai-sdk/rsc';
```

--------------------------------

### Experimental_StdioMCPTransport

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/mcp-stdio-transport

Initializes an experimental transport for MCP clients using standard input/output streams in Node.js.

```APIDOC
## Experimental_StdioMCPTransport

### Description
Creates a transport for Model Context Protocol (MCP) clients to communicate with MCP servers using standard input and output streams. This transport is only supported in Node.js environments.

This feature is experimental and may change or be removed in the future.

### Import

```typescript
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";
```

### Parameters

#### Request Body

- **config** (StdioConfig) - Required - Configuration for the MCP client.
  - **command** (string) - Required - The command to run the MCP server.
  - **args** (string[]) - Optional - The arguments to pass to the MCP server.
  - **env** (Record<string, string>) - Optional - The environment variables to set for the MCP server.
  - **stderr** (IOType | Stream | number) - Optional - The stream to write the MCP server's stderr to.
  - **cwd** (string) - Optional - The current working directory for the MCP server.

### Request Example

```json
{
  "command": "node",
  "args": ["--experimental-llm-types", "./server.js"],
  "env": {
    "MY_VAR": "my_value"
  },
  "stderr": "pipe",
  "cwd": "/path/to/server"
}
```

### Response

#### Success Response (200)

This function does not return a value, but it initializes the transport. The actual communication details would depend on the MCP protocol itself.

#### Response Example

(No direct response body, as this is a constructor/initializer)
```

--------------------------------

### Integrate Anthropic and Google Multi-Modal AI Providers with AI SDK

Source: https://v6.ai-sdk.dev/docs/guides/multi-modal-chatbot

This TypeScript snippet illustrates how to switch between Anthropic and Google AI providers within the AI SDK. It demonstrates importing the specific provider and configuring the `streamText` function with the chosen model. Ensure relevant provider packages are installed and API keys are updated in `.env.local` for successful execution.

```typescript
// Using Anthropic
import { anthropic } from '@ai-sdk/anthropic';
const result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  messages: convertToModelMessages(messages),
});
```

```typescript
// Using Google
import { google } from '@ai-sdk/google';
const result = streamText({
  model: google('gemini-2.5-flash'),
  messages: convertToModelMessages(messages),
});
```

--------------------------------

### Display AI Chatbot Tool Invocations in React UI (TypeScript)

Source: https://v6.ai-sdk.dev/docs/getting-started/nextjs-pages-router

This React component updates the chat interface to correctly render different types of message parts received from the AI. It uses the `useChat` hook from `@ai-sdk/react` to manage chat state. Specifically, it distinguishes between 'text' parts and 'tool-weather' parts, displaying the latter as a JSON representation of the tool call and its result, enhancing the user experience by showing when and how tools are used.

```tsx
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(message => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <div key={`${message.id}-${i}`}>{part.text}</div>;
              case 'tool-weather':
                return (
                  <pre key={`${message.id}-${i}`}>
                    {JSON.stringify(part, null, 2)}
                  </pre>
                );
            }
          })}
        </div>
      ))}

      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={e => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
```

--------------------------------

### Configure AI Agent Tools with Runtime Context (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/configuring-call-options

This example shows how to modify the behavior of an AI agent's tools, specifically a `web_search` tool, using runtime options. It allows passing user location data to the tool, enabling location-aware search results without changing the agent's core definition.

```ts
import { openai } from '@ai-sdk/openai';
import { ToolLoopAgent } from 'ai';
import { z } from 'zod';

const newsAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  callOptionsSchema: z.object({
    userCity: z.string().optional(),
    userRegion: z.string().optional(),
  }),
  tools: {
    web_search: openai.tools.webSearch(),
  },
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    tools: {
      web_search: openai.tools.webSearch({
        searchContextSize: 'low',
        userLocation: {
          type: 'approximate',
          city: options.userCity,
          region: options.userRegion,
          country: 'US',
        },
      }),
    },
  }),
});

await newsAgent.generate({
  prompt: 'What are the top local news stories?',
  options: {
    userCity: 'San Francisco',
    userRegion: 'California',
  },
});
```

--------------------------------

### Rerank Documents with Cohere Reranking Model (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/rerank

This example demonstrates how to use the `rerank` function from the `ai` SDK to reorder a list of documents based on a given query. It utilizes the Cohere reranking model, specifying documents as an array of strings and a query, then extracts the ranking result.

```ts
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: ['sunny day at the beach', 'rainy afternoon in the city'],
  query: 'talk about rain',
});
```

--------------------------------

### Configure ToolLoopAgent with Dynamic Call Options for Contextual Responses

Source: https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta

This example illustrates how to use `callOptionsSchema` with Zod to define type-safe runtime inputs for a `ToolLoopAgent`. These call options allow dynamic configuration of the agent's behavior, such as tailoring responses based on user context like account type and user ID, providing flexibility without creating multiple agents.

```typescript
import { ToolLoopAgent } from 'ai';
import { z } from 'zod';

const supportAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  callOptionsSchema: z.object({
    userId: z.string(),
    accountType: z.enum(['free', 'pro', 'enterprise']),
  }),
  instructions: 'You are a helpful customer support agent.',
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions:
      settings.instructions +
      `\nUser context:\n- Account type: ${options.accountType}\n- User ID: ${options.userId}\n\nAdjust your response based on the user's account level.`,
  }),
});

// Pass options when calling the agent
const result = await supportAgent.generate({
  prompt: 'How do I upgrade my account?',
  options: {
    userId: 'user_123',
    accountType: 'free',
  },
});
```

--------------------------------

### Configure Nuxt RuntimeConfig for AI Gateway API Key

Source: https://v6.ai-sdk.dev/docs/getting-started/nuxt

This TypeScript code modifies your `nuxt.config.ts` file to integrate the `NUXT_AI_GATEWAY_API_KEY` into Nuxt's runtime configuration. By defining `aiGatewayApiKey` within `runtimeConfig`, the application can securely access the API key loaded from the environment variables during execution.

```typescript
export default defineNuxtConfig({
  // rest of your nuxt config
  runtimeConfig: {
    aiGatewayApiKey: '',
  },
});
```

--------------------------------

### Check for DownloadError Instance in TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-errors/ai-download-error

Demonstrates how to verify if an error is an instance of DownloadError using the isInstance() method. This allows for specific error handling when download operations fail. The example imports DownloadError from the 'ai' package and uses type checking to handle download-specific errors.

```typescript
import { DownloadError } from 'ai';

if (DownloadError.isInstance(error)) {
  // Handle the error
}
```

--------------------------------

### Define Assistant Message with Tool Call Content in AI SDK (JavaScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

This example demonstrates an assistant message that includes a 'tool-call' content part, indicating that the model intends to invoke an external tool. It specifies a `toolCallId`, the `toolName` to be called, and an `input` object containing arguments for the tool. This is crucial for enabling function calling capabilities with LLMs.

```javascript
const result = await generateText({
  model: 'openai/gpt-4.1',
  messages: [
    { role: 'user', content: 'How many calories are in this block of cheese?' },
    {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId: '12345',
          toolName: 'get-nutrition-data',
          input: { cheese: 'Roquefort' },
        },
      ],
    },
  ],
});
```

--------------------------------

### Send Multiple Files as Attachments with useChat Hook

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot

This example demonstrates how to use the `FileList` feature with the `useChat` hook to send multiple files as attachments. The hook automatically converts supported file types (image/*, text/*) into multi-modal content parts. Users need to manually handle other content types. It requires the `@ai-sdk/react` library.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useState } from 'react';

export default function Page() {
  const { messages, sendMessage, status } = useChat();

  const [input, setInput] = useState('');
  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div>
        {messages.map(message => (
          <div key={message.id}>
            <div>{`${message.role}: `}</div>

            <div>
              {message.parts.map((part, index) => {
                if (part.type === 'text') {
                  return <span key={index}>{part.text}</span>;
                }

                if (
                  part.type === 'file' &&
                  part.mediaType?.startsWith('image/')
                ) {
                  return <img key={index} src={part.url} alt={part.filename} />;
                }

                return null;
              })}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={event => {
          event.preventDefault();
          if (input.trim()) {
            sendMessage({
              text: input,
              files,
            });
            setInput('');
            setFiles(undefined);

            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        }}>
        <input
          type="file"
          onChange={event => {
            if (event.target.files) {
              setFiles(event.target.files);
            }
          }}
          multiple
          ref={fileInputRef}
        />
        <input
          value={input}
          placeholder="Send message..."
          onChange={e => setInput(e.target.value)}
          disabled={status !== 'ready'} />
      </form>
    </div>
  );
}

```

--------------------------------

### Handle NoImageGeneratedError in AI SDK (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/image-generation

Provides an example of how to catch and handle `AI_NoImageGeneratedError` when `generateImage` fails. This error occurs if the AI provider cannot generate a valid image or its response is unparseable, preserving `responses` and `cause` for logging and detailed error handling.

```ts
import { generateImage, NoImageGeneratedError } from 'ai';

try {
  await generateImage({ model, prompt });
} catch (error) {
  if (NoImageGeneratedError.isInstance(error)) {
    console.log('NoImageGeneratedError');
    console.log('Cause:', error.cause);
    console.log('Responses:', error.responses);
  }
}
```

--------------------------------

### Refine AI Chat API Route with System Instructions in Next.js (TypeScript)

Source: https://v6.ai-sdk.dev/docs/guides/rag-chatbot

This TypeScript snippet updates the Next.js API route handler to include a system prompt for the AI model. The system prompt guides the gpt-5-mini model to behave as a helpful assistant, prioritize information from tool calls, and respond with 'Sorry, I don't know' if no relevant information is available, thereby refining its conversational behavior.

```typescript
import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, streamText, UIMessage } from 'ai';


// Allow streaming responses up to 30 seconds
export const maxDuration = 30;


export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();


  const result = streamText({
    model: openai('gpt-5-mini'),
    system: `You are a helpful assistant. Check your knowledge base before answering any questions.
    Only respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry, I don't know."`,
    messages: convertToModelMessages(messages),
  });


  return result.toUIMessageStreamResponse();
}
```

--------------------------------

### Configure Provider Options for Image in Message Part (TypeScript)

Source: https://v6.ai-sdk.dev/docs/foundations/prompts

This snippet demonstrates how to set provider-specific options, such as 'imageDetail' for OpenAI, at the message part level for an image within a message. It shows the structure of a ModelMessage with both text and image content, including provider options for the image part. Ensure the 'ai' package is installed.

```typescript
import { ModelMessage } from 'ai';

const messages: ModelMessage[] = [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Describe the image in detail.',
        providerOptions: {
          openai: { imageDetail: 'low' },
        },
      },
      {
        type: 'image',
        image:
          'https://github.com/vercel/ai/blob/main/examples/ai-core/data/comic-cat.png?raw=true',
        // Sets image detail configuration for image part:
        providerOptions: {
          openai: { imageDetail: 'low' },
        },
      },
    ],
  },
];
```

--------------------------------

### Convert LlamaIndex ChatEngine Stream to Data Response

Source: https://v6.ai-sdk.dev/docs/reference/stream-helpers/llamaindex-adapter

Demonstrates converting a LlamaIndex ChatEngine stream into a data stream response. This example uses 'toDataStreamResponse' to handle the stream conversion, expecting a JSON request with a 'prompt' and returning an OpenAI model's response.

```typescript
import { OpenAI, SimpleChatEngine } from 'llamaindex';
import { toDataStreamResponse } from '@ai-sdk/llamaindex';

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const llm = new OpenAI({ model: 'gpt-5-mini' });
  const chatEngine = new SimpleChatEngine({ llm });

  const stream = await chatEngine.chat({
    message: prompt,
    stream: true,
  });

  return toDataStreamResponse(stream);
}
```

--------------------------------

### Handle Multi-modal Tool Results with Image Content in TypeScript

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

Demonstrates converting multi-modal tool results (like screenshots) into model-compatible format using the toModelOutput function. This experimental feature is supported by Anthropic and OpenAI models. The example shows returning image data as base64 and mapping it to content parts for LLM consumption.

```typescript
const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  tools: {
    computer: anthropic.tools.computer_20241022({
      // ...
      async execute({ action, coordinate, text }) {
        switch (action) {
          case 'screenshot': {
            return {
              type: 'image',
              data: fs
                .readFileSync('./data/screenshot-editor.png')
                .toString('base64'),
            };
          }
          default: {
            return `executed ${action}`;
          }
        }
      },

      // map to tool result content for LLM consumption:
      toModelOutput(result) {
        return {
          type: 'content',
          value:
            typeof result === 'string'
              ? [{ type: 'text', text: result }]
              : [{ type: 'media', data: result.data, mediaType: 'image/png' }],
        };
      },
    }),
  },
  // ...
});
```

--------------------------------

### Server Action using `streamUI` function with OpenAI provider

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-3-1

This Server Action illustrates the migration to the `streamUI` function, which supports any compatible AI SDK provider. It involves importing the AI SDK's OpenAI provider and passing it to the `model` key. Tools are defined with a `generate` key for returning React Server Components, offering greater flexibility.

```tsx
import { streamUI } from '@ai-sdk/rsc';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Spinner, Weather } from '@/components';
import { getWeather } from '@/utils';

async function submitMessage(userInput = 'What is the weather in SF?') {
  'use server';

  const result = await streamUI({
    model: openai('gpt-4.1'),
    system: 'You are a helpful assistant',
    messages: [{ role: 'user', content: userInput }],
    text: ({ content }) => <p>{content}</p>,
    tools: {
      get_city_weather: {
        description: 'Get the current weather for a city',
        parameters: z
          .object({
            city: z.string().describe('Name of the city'),
          })
          .required(),
        generate: async function* ({ city }) {
          yield <Spinner />;
          const weather = await getWeather(city);
          return <Weather info={weather} />;
        },
      },
    },
  });

  return result.value;
}
```

--------------------------------

### Define a Dynamic Tool with `dynamicTool` (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/dynamic-tool

This example demonstrates how to define a `dynamicTool` using the `ai` SDK. It accepts an `inputSchema` (e.g., using Zod) and an `execute` function that handles unknown input types. The `execute` function requires runtime casting/validation of the `input` to perform dynamic logic, returning a result.

```ts
import { dynamicTool } from 'ai';
import { z } from 'zod';

export const customTool = dynamicTool({
  description: 'Execute a custom user-defined function',
  inputSchema: z.object({}),
  // input is typed as 'unknown'
  execute: async input => {
    const { action, parameters } = input as any;

    // Execute your dynamic logic
    return {
      result: `Executed ${action} with ${JSON.stringify(parameters)}`,
    };
  },
});
```

--------------------------------

### Automatically Continue Chat After Approvals (React)

Source: https://v6.ai-sdk.dev/docs/introduction/announcing-ai-sdk-6-beta

This example shows how to configure the `useChat` hook to automatically submit the conversation after all tool approval requests have been handled. By setting `sendAutomaticallyWhen` to `lastAssistantMessageIsCompleteWithApprovalResponses`, the chat flow resumes without manual intervention once approvals are resolved.

```typescript
import { useChat } from '@ai-sdk/react';
import { lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';


const { messages, addToolApprovalResponse } = useChat({
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
});
```

--------------------------------

### Import `streamToResponse` from AI SDK

Source: https://v6.ai-sdk.dev/docs/reference/stream-helpers/stream-to-response

This snippet shows how to import the `streamToResponse` function from the 'ai' package. This is the initial step to use the function in your project.

```typescript
import { streamToResponse } from "ai";
```

--------------------------------

### Create Dynamic Tools for AI SDK Core (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

This example demonstrates how to define a `dynamicTool` when tool schemas are not known at compile time, such as for MCP tools or runtime-defined functions. The `inputSchema` is often `z.object({})`, and the `execute` function receives `input` as `unknown`, requiring explicit runtime validation or casting.

```ts
import { dynamicTool } from 'ai';
import { z } from 'zod';

const customTool = dynamicTool({
  description: 'Execute a custom function',
  inputSchema: z.object({}),
  execute: async input => {
    // input is typed as 'unknown'
    // You need to validate/cast it at runtime
    const { action, parameters } = input as any;

    // Execute your dynamic logic
    return { result: `Executed ${action}` };
  },
});
```

--------------------------------

### Create Local Environment File

Source: https://v6.ai-sdk.dev/docs/guides/multi-modal-chatbot

This command creates an empty `.env.local` file in the project's root directory. This file is used to store sensitive environment variables, such as API keys, that should not be committed to version control.

```bash
touch .env.local
```

--------------------------------

### Extract and Define Reusable AI Tool in TypeScript

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

Shows best practice for extracting tools into separate files using the tool helper function for proper type inference. The example creates a weather tool with Zod schema validation for input parameters and an async execute function that returns structured data.

```typescript
import { tool } from 'ai';
import { z } from 'zod';

// the `tool` helper function ensures correct type inference:
export const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});
```

--------------------------------

### createAI

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-rsc/create-ai

Creates a client-server context provider for managing AI and UI states within your application.

```APIDOC
## createAI

### Description
Creates a client-server context provider that can be used to wrap parts of your application tree to easily manage both UI and AI states of your application.

### Import
```typescript
import { createAI } from "@ai-sdk/rsc"
```

### API Signature

#### Parameters

- **actions** (Record<string, Action>) - Server side actions that can be called from the client.
- **initialAIState** (any) - Initial AI state to be used in the client.
- **initialUIState** (any) - Initial UI state to be used in the client.
- **onGetUIState** (() => UIState) - is called during SSR to compare and update UI state.
- **onSetAIState** ((Event) => void) - is triggered whenever an update() or done() is called by the mutable AI state in your action, so you can safely store your AI state in the database.
  - **Event** (Event) - 
    - **state** (AIState) - The resulting AI state after the update.
    - **done** (boolean) - Whether the AI state updates have been finalized or not.

### Returns

It returns an `<AI/>` context provider.

### Examples

- Learn to manage AI and UI states in Next.js: `/examples/next-app/state-management/ai-ui-states`
- Learn to persist and restore states UI/AI states in Next.js: `/examples/next-app/state-management/save-and-restore-states`
```

--------------------------------

### Infer Tool Types from Weather Tool Definition using InferUITool

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/infer-ui-tool

Complete example showing how to define a weather tool with Zod schema validation and use InferUITool to automatically infer its input and output types. The weatherTool includes a description, Zod parameters schema, and async execute function. InferUITool creates a type with input as { location: string } and output as string.

```typescript
import { InferUITool } from 'ai';
import { z } from 'zod';

const weatherTool = {
  description: 'Get the current weather',
  parameters: z.object({
    location: z.string().describe('The city and state'),
  }),
  execute: async ({ location }) => {
    return `The weather in ${location} is sunny.`;
  },
};

// Infer the types from the tool
type WeatherUITool = InferUITool<typeof weatherTool>;
// This creates a type with:
// {
//   input: { location: string };
//   output: string;
// }
```

--------------------------------

### Create Nuxt API Route for Streaming Chat with AI Gateway - TypeScript

Source: https://v6.ai-sdk.dev/docs/getting-started/nuxt

Implements a Nuxt server API route that handles chat messages using AI SDK's streamText function with Vercel AI Gateway. The route converts UI messages to model format, streams AI responses, and returns them as a UI message stream response. Requires AI Gateway API key configuration in runtime config.

```typescript
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  createGateway,
} from 'ai';

export default defineLazyEventHandler(async () => {
  const apiKey = useRuntimeConfig().aiGatewayApiKey;
  if (!apiKey) throw new Error('Missing AI Gateway API key');
  const gateway = createGateway({
    apiKey: apiKey,
  });

  return defineEventHandler(async (event: any) => {
    const { messages }: { messages: UIMessage[] } = await readBody(event);

    const result = streamText({
      model: gateway('openai/gpt-5.1'),
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  });
});
```

--------------------------------

### Display Loading Indicator during Generation (React Server Components)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui

This 'Before' example illustrates how to display a loading indicator in a React Server Component (RSC) context using the `initial` parameter of `streamUI`. It sets a simple `div` with 'Loading...' text to be shown while the AI model is generating a response. This is managed by the `@ai-sdk/rsc` library.

```tsx
import { openai } from '@ai-sdk/openai';
import { streamUI } from '@ai-sdk/rsc';

const { value: stream } = await streamUI({
  model: openai('gpt-5-mini'),
  system: 'you are a friendly assistant!',
  messages,
  initial: <div>Loading...</div>,
  text: async function* ({ content, done }) {
    // process text
  },
  tools: {
    // tool definitions
  },
});

return stream;

```

--------------------------------

### Rerank Structured Documents with AI SDK (TypeScript)

Source: https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta

This example showcases how to apply reranking to structured documents, such as emails or database entries, using the AI SDK. It defines an array of objects as documents and a query, then uses a Cohere reranking model to identify the most relevant structured document.

```typescript
import { rerank } from 'ai';
import { cohere } from '@ai-sdk/cohere';

const documents = [
  {
    from: 'Paul Doe',
    subject: 'Follow-up',
    text: 'We are happy to give you a discount of 20% on your next order.',
  },
  {
    from: 'John McGill',
    subject: 'Missing Info',
    text: 'Sorry, but here is the pricing information from Oracle: $5000/month',
  },
];

const { rerankedDocuments } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents,
  query: 'Which pricing did we get from Oracle?',
  topN: 1,
});

console.log(rerankedDocuments[0]);
// { from: 'John McGill', subject: 'Missing Info', text: '...' }
```

--------------------------------

### Initialize and Use AI SDK MCP Client with Tools (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

This TypeScript code demonstrates how to initialize an AI SDK MCP client, connect it to a local 'node server.js' process via standard I/O, fetch available tools, and then use these tools to generate text with an OpenAI model. It includes error handling for client operations and ensures the client is properly closed upon completion or error.

```typescript
import { experimental_createMCPClient, generateText } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';
import { openai } from '@ai-sdk/openai';

let client;

try {
  client = await experimental_createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: 'node server.js',
    }),
  });

  const tools = await client.tools();

  const response = await generateText({
    model: openai('gpt-5-mini'),
    tools,
    messages: [{ role: 'user', content: 'Query the data' }],
  });

  console.log(response);
} catch (error) {
  console.error('Error:', error);
} finally {
  // ensure the client is closed even if an error occurs
  if (client) {
    await client.close();
  }
}
```

--------------------------------

### Apply Middleware to Customize Embedding Models (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/embeddings

This example demonstrates how to use `wrapEmbeddingModel` and `EmbeddingModelV3Middleware` to enhance and customize embedding models in the AI SDK. Specifically, it uses `defaultEmbeddingSettingsMiddleware` to set default provider options, such as `outputDimensionality` and `taskType` for Google's Gemini embedding model.

```typescript
import { google } from '@ai-sdk/google';
import {
  customProvider,
  defaultEmbeddingSettingsMiddleware,
  embed,
  wrapEmbeddingModel,
} from 'ai';

const embeddingModelWithDefaults = wrapEmbeddingModel({
  model: google.textEmbedding('gemini-embedding-001'),
  middleware: defaultEmbeddingSettingsMiddleware({
    settings: {
      providerOptions: {
        google: {
          outputDimensionality: 256,
          taskType: 'CLASSIFICATION',
        },
      },
    },
  }),
});
```

--------------------------------

### Integrate RAG as Middleware with TypeScript

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/middleware

This example demonstrates how to use Retrieval Augmented Generation (RAG) as middleware. It intercepts model parameters, retrieves relevant information based on the last user message (using hypothetical helper functions `getLastUserMessageText` and `findSources`), and prepends this information as an instruction to the prompt before calling the model.

```typescript
import type { LanguageModelV3Middleware } from '@ai-sdk/provider';

export const yourRagMiddleware: LanguageModelV3Middleware = {
  transformParams: async ({ params }) => {
    const lastUserMessageText = getLastUserMessageText({
      prompt: params.prompt,
    });

    if (lastUserMessageText == null) {
      return params; // do not use RAG (send unmodified parameters)
    }

    const instruction = 
      'Use the following information to answer the question:\n' +
      findSources({ text: lastUserMessageText })
        .map(chunk => JSON.stringify(chunk))
        .join('\n');

    return addToLastUserMessage({ params, text: instruction });
  },
};

```

--------------------------------

### Initialize MCP Client with Stdio Transport for Local Development - TypeScript

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

Creates an MCP client using stdio (standard input/output) transport for connecting to local MCP servers. This transport should only be used for local development and cannot be deployed to production environments. Uses command and arguments to spawn the local server process.

```typescript
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
// Or use the AI SDK's stdio transport:
// import { Experimental_StdioMCPTransport as StdioClientTransport } from '@ai-sdk/mcp/mcp-stdio';

const mcpClient = await createMCPClient({
  transport: new StdioClientTransport({
    command: 'node',
    args: ['src/stdio/dist/server.js'],
  }),
});
```

--------------------------------

### Close MCP Client on streaming response finish (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

This example demonstrates how to properly close the MCP client when an LLM streaming response has completed. It uses the `onFinish` callback provided by the `streamText` function to ensure resource cleanup.

```typescript
const mcpClient = await experimental_createMCPClient({
  // ...
});

const tools = await mcpClient.tools();

const result = await streamText({
  model: 'openai/gpt-4.1',
  tools,
  prompt: 'What is the weather in Brooklyn, New York?',
  onFinish: async () => {
    await mcpClient.close();
  },
});
```

--------------------------------

### Accessing Message Metadata via onFinish Callback on Client-side in AI SDK v5

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This client-side example illustrates how to access custom message metadata, specifically `totalUsage`, through the `onFinish` callback of the `useChat` hook in AI SDK v5. It demonstrates logging the metadata after a message generation is complete.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import type { MyUIMessage } from './api/chat/route';
import { DefaultChatTransport } from 'ai';

export default function Chat() {
  // Use custom message type defined on the server (optional for type-safety)
  const { messages } = useChat<MyUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    onFinish: ({ message }) => {
      // Access message metadata via onFinish callback
      console.log(message.metadata?.totalUsage);
    },
  });
}
```

--------------------------------

### Define MCP Tools Schema explicitly (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

This example shows how to explicitly define tool schemas using Zod for enhanced type safety and control. This approach provides IDE autocompletion and catches parameter mismatches during development, while only loading specified tools.

```typescript
import { z } from 'zod';

const tools = await mcpClient.tools({
  schemas: {
    'get-data': {
      inputSchema: z.object({
        query: z.string().describe('The data query'),
        format: z.enum(['json', 'text']).optional(),
      }),
    },
    // For tools with zero inputs, you should use an empty object:
    'tool-with-no-args': {
      inputSchema: z.object({}),
    },
  },
});
```

--------------------------------

### Configure AI Model with `gateway` Function from '@ai-sdk/gateway' Package

Source: https://v6.ai-sdk.dev/docs/getting-started/svelte

Illustrates an alternative method to explicitly use the `gateway` function by importing it directly from the dedicated `@ai-sdk/gateway` package. This option is useful for explicit dependency management.

```ts
import { gateway } from '@ai-sdk/gateway';
model: gateway('openai/gpt-5.1');
```

--------------------------------

### Configure Multi-Step Tool Calls in AI SDK API Route (TypeScript)

Source: https://v6.ai-sdk.dev/docs/getting-started/nuxt

This TypeScript code modifies the `server/api/chat.ts` file to enable multi-step tool calls. By setting `stopWhen: stepCountIs(5)` in the `streamText` function, the model is allowed up to 5 steps for generation, enabling it to use tool results to formulate a complete answer. It defines a `weather` tool to fetch temperature based on location.

```typescript
import {
  createGateway,
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from 'ai';
import { z } from 'zod';

export default defineLazyEventHandler(async () => {
  const apiKey = useRuntimeConfig().aiGatewayApiKey;
  if (!apiKey) throw new Error('Missing AI Gateway API key');
  const gateway = createGateway({
    apiKey: apiKey,
  });

  return defineEventHandler(async (event: any) => {
    const { messages }: { messages: UIMessage[] } = await readBody(event);

    const result = streamText({
      model: gateway('openai/gpt-5.1'),
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        weather: tool({
          description: 'Get the weather in a location (fahrenheit)',
          inputSchema: z.object({
            location: z
              .string()
              .describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => {
            const temperature = Math.round(Math.random() * (90 - 32) + 32);
            return {
              location,
              temperature,
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  });
});
```

--------------------------------

### Implement AI Chatbot API Route with Weather Tool in Expo

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

API route implementation for an AI chatbot that includes a weather tool for external data retrieval. The code uses the AI SDK's streamText function with tool calling capabilities, allowing the LLM to fetch weather data when users ask about weather conditions. The weather tool includes input validation using Zod schema and an execute function that simulates weather data retrieval.

```typescript
import { streamText, UIMessage, convertToModelMessages, tool } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'openai/gpt-5.1',
    messages: convertToModelMessages(messages),
    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}
```

--------------------------------

### Call RSC Server Action and Update UI State (Before)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui

This 'before' example shows how a chat interface would call the RSC server action (`sendMessage`) and update its UI state using the `useUIState` hook. It illustrates client-side interaction with the server action to send messages and receive streamed responses. Dependencies include `@ai-sdk/rsc`.

```tsx
'use client';

import { useState, ReactNode } from 'react';
import { useActions, useUIState } from '@ai-sdk/rsc';

export default function Page() {
  const { sendMessage } = useActions();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useUIState();

  return (
    <div>
      {messages.map(message => message)}

      <form
        onSubmit={async () => {
          const response: ReactNode = await sendMessage(input);
          setMessages(msgs => [...msgs, response]);
        }}>
        <input type="text" />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
```

--------------------------------

### Access Message Metadata on Client using AI SDK

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/message-metadata

Access and display message metadata on the client-side component. After receiving messages from the server, you can access the custom metadata via the `message.metadata` property and conditionally render it, for example, showing timestamps or token counts.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { MyUIMessage } from '@/types';

export default function Chat() {
  const { messages } = useChat<MyUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          <div>
            {message.role === 'user' ? 'User: ' : 'AI: '}
            {message.metadata?.createdAt && (
              <span className="text-sm text-gray-500">
                {new Date(message.metadata.createdAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Render message content */}
          {message.parts.map((part, index)
            part.type === 'text' ? <div key={index}>{part.text}</div> : null,
          )}

          {/* Display additional metadata */}
          {message.metadata?.totalTokens && (
            <div className="text-xs text-gray-400">
              {message.metadata.totalTokens} tokens
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

--------------------------------

### Generate Object with Zod Schema

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/generate-object

Generates a typed object using a Zod schema to define the structure. This example creates a recipe object with nested properties including name, ingredients array, and cooking steps. The model enforces the schema structure in its response.

```typescript
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: openai('gpt-4.1'),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a lasagna recipe.',
});

console.log(JSON.stringify(object, null, 2));
```

--------------------------------

### Control Tool Selection with toolChoice Setting in AI SDK (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

Illustrates the use of the `toolChoice` setting within `generateText` to influence when and which tools the language model calls. This example specifically uses `'required'` to force the model to invoke a tool, ensuring that a tool action is taken based on the prompt.

```typescript
import { z } from 'zod';
import { generateText, tool } from 'ai';

const result = await generateText({
  model: 'openai/gpt-5-mini',
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
  toolChoice: 'required', // force the model to call a tool
  prompt: 'What is the weather in San Francisco?',
});
```

--------------------------------

### Handle Other Errors with createStreamableValue in React Server Components

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/error-handling

This example shows how to handle errors when streaming non-UI values using `createStreamableValue`. It wraps the streaming logic in a try-catch block, updating the stream with data or returning an error object if an exception occurs.

```tsx
'use server';

import { createStreamableValue } from '@ai-sdk/rsc';
import { fetchData, emptyData } from '../utils/data';

export const getStreamedData = async () => {
  const streamableData = createStreamableValue<string>(emptyData);

  try {
    (() => {
      const data1 = await fetchData();
      streamableData.update(data1);

      const data2 = await fetchData();
      streamableData.update(data2);

      const data3 = await fetchData();
      streamableData.done(data3);
    })();

    return { data: streamableData.value };
  } catch (e) {
    return { error: e.message };
  }
};
```

--------------------------------

### Stream Tool Inputs in AI SDK 5.0 (TypeScript/TSX)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This snippet demonstrates how to handle streaming tool inputs in AI SDK 5.0 using `result.fullStream`. It shows how to detect the start, delta, and end of tool input generation, allowing for real-time processing of tool arguments. The `tool-call` type provides the final, complete tool input.

```tsx
for await (const chunk of result.fullStream) {
  switch (chunk.type) {
    case 'tool-input-start': {
      console.log(`Starting tool input for ${chunk.toolName}: ${chunk.id}`);
      break;
    }
    case 'tool-input-delta': {
      // Stream the JSON input as it's being generated
      process.stdout.write(chunk.delta);
      break;
    }
    case 'tool-input-end': {
      console.log(`Completed tool input: ${chunk.id}`);
      break;
    }
    case 'tool-call': {
      // Final tool call with complete input
      console.log('Tool call:', chunk.toolName, chunk.input);
      break;
    }
  }
}
```

--------------------------------

### Display Tool Invocations in Vue Chat UI with Message Parts

Source: https://v6.ai-sdk.dev/docs/getting-started/nuxt

Updates a Vue component to render different message part types including text and tool invocations. Iterates through message parts to display text content normally and weather tool calls as formatted JSON. This pattern allows the UI to properly show both AI text responses and tool execution results.

```typescript
<script setup lang="ts">
import { Chat } from "@ai-sdk/vue";
import { ref } from "vue";

const input = ref("");
const chat = new Chat({});

const handleSubmit = (e: Event) => {
    e.preventDefault();
    chat.sendMessage({ text: input.value });
    input.value = "";
};
</script>

<template>
    <div>
        <div v-for="(m, index) in chat.messages" :key="m.id ? m.id : index">
            {{ m.role === "user" ? "User: " : "AI: " }}
            <div
                v-for="(part, index) in m.parts"
                :key="`${m.id}-${part.type}-${index}`"
            >
                <div v-if="part.type === 'text'">{{ part.text }}</div>
                <pre v-if="part.type === 'tool-weather'">{{ JSON.stringify(part, null, 2) }}</pre>
            </div>
        </div>

        <form @submit="handleSubmit">
            <input v-model="input" placeholder="Say something..." />
        </form>
    </div>
</template>
```

--------------------------------

### Process Stream Chunks with onChunk Callback in AI SDK Core

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-text

This example showcases the `onChunk` callback for processing individual data chunks as they arrive from the LLM stream. It allows developers to implement custom logic based on various chunk types, such as 'text', 'reasoning', or 'tool-call', enabling fine-grained control over streaming output.

```tsx
import { streamText } from 'ai';

const result = streamText({
  model: 'openai/gpt-4.1',
  prompt: 'Invent a new holiday and describe its traditions.',
  onChunk({
    chunk
  }) {
    // implement your own logic here, e.g.:
    if (chunk.type === 'text') {
      console.log(chunk.text);
    }
  },
});
```

--------------------------------

### Import createProviderRegistry - TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/provider-registry

This is a simple import statement for the `createProviderRegistry` function from the 'ai' package, which is the foundational step for setting up a model registry.

```TypeScript
import { createProviderRegistry } from "ai"
```

--------------------------------

### Controlled Input Management with useCompletion (React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/completion

This example illustrates how to manage the input state manually using `setInput` provided by the `useCompletion` hook. This offers more control for advanced scenarios like form validation or custom input components, diverging from the default `handleInputChange` and `handleSubmit`.

```tsx
const { input, setInput } = useCompletion();

return (
  <>
    <MyCustomInput value={input} onChange={value => setInput(value)} />
  </>
);

```

--------------------------------

### Wrap Language Model with Middleware (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/wrap-language-model

Demonstrates how to import and use the `wrapLanguageModel` function to enhance a language model with custom middleware. This function takes the model to be wrapped and the middleware functions as arguments, returning a new language model instance with the applied enhancements. Ensure you have the 'ai' package installed.

```typescript
import { wrapLanguageModel } from 'ai';

const wrappedLanguageModel = wrapLanguageModel({
  model: 'openai/gpt-4.1',
  middleware: yourLanguageModelMiddleware,
});
```

--------------------------------

### Handle AI SDK Step Completion with `onStepFinish` Callback (TypeScript/TSX)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

This example illustrates the use of the `onStepFinish` callback within `generateText` (or `streamText`). The callback triggers upon the completion of each step, providing access to the step's generated `text`, `toolCalls`, `toolResults`, `finishReason`, and `usage` for custom processing, such as saving chat history or recording metrics.

```tsx
import { generateText } from 'ai';

const result = await generateText({
  // ...
  onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
    // your own logic, e.g. for saving the chat history or recording usage
  },
});
```

--------------------------------

### Import InferUITool Type Helper from AI SDK

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/infer-ui-tool

Shows how to import the InferUITool type helper from the 'ai' package. This type utility is used for inferring input and output types of tools to ensure type safety in your application.

```typescript
import { InferUITool } from 'ai';
```

--------------------------------

### Migrate OpenAI Query: Legacy vs. AI SDK Core

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-3-1

Compares two methods of querying OpenAI models. The first uses the OpenAI SDK directly, piping the response through `OpenAIStream`. The second, refactored for AI SDK Core, uses the unified `streamText` function and the `@ai-sdk/openai` provider for a more streamlined approach.

```tsx
import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    stream: true,
    messages,
  });

  const stream = OpenAIStream(response);

  return new StreamingTextResponse(stream);
}
```

```tsx
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4.1'),
    messages,
  });

  return result.toUIMessageStreamResponse();
}
```

--------------------------------

### Restore UI State using AI State Proxy

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/saving-and-restoring-states

This example illustrates restoring UI state by using the AI state as a proxy. It leverages the `onGetUIState` callback to listen for SSR events and reconstructs the UI state based on database history if it differs from the current app state.

```tsx
export const AI = createAI<ServerMessage[], ClientMessage[]>({
  actions: {
    continueConversation,
  },
  onGetUIState: async () => {
    'use server';

    const historyFromDB: ServerMessage[] = await loadChatFromDB();
    const historyFromApp: ServerMessage[] = getAIState();

    // If the history from the database is different from the
    // history in the app, they're not in sync so return the UIState
    // based on the history from the database

    if (historyFromDB.length !== historyFromApp.length) {
      return historyFromDB.map(({ role, content }) => ({
        id: generateId(),
        role,
        display:
          role === 'function' ? (
            <Component {...JSON.parse(content)} />
          ) : (
            content
          ),
      }));
    }
  },
});
```

--------------------------------

### Update Dependencies for AI SDK 4.0 and 5.0 (package.json)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0-data

This snippet shows how to update npm dependencies to include both AI SDK v5.0 and v4.3.2 (aliased as 'ai-legacy'). This is necessary to maintain proper TypeScript types for v4 messages during the migration process. The example uses npm aliases to manage different versions of the same package.

```json
{
  "dependencies": {
    "ai": "^5.0.0",
    "ai-legacy": "npm:ai@^4.3.2"
  }
}
```

--------------------------------

### Stream a Structured Object with Zod Schema (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/stream-object

This example demonstrates how to use `streamObject` to generate a structured JSON object, such as a recipe, based on a Zod schema. It defines a `recipe` object with `name`, `ingredients`, and `steps` and streams partial objects as they are generated by the language model. The `partialObjectStream` allows processing the object incrementally.

```ts
import { openai } from '@ai-sdk/openai';
import { streamObject } from 'ai';
import { z } from 'zod';

const { partialObjectStream } = streamObject({
  model: openai('gpt-4.1'),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a lasagna recipe.',
});

for await (const partialObject of partialObjectStream) {
  console.clear();
  console.log(partialObject);
}
```

--------------------------------

### Message Part Level Configuration

Source: https://v6.ai-sdk.dev/docs/foundations/prompts

Demonstrates how to configure provider-specific options at the message part level for richer interactions.

```APIDOC
## Message Part Level Configuration

### Description
Certain provider-specific options require configuration at the message part level. This allows for fine-grained control over how different parts of a message are processed by specific AI providers.

### Method
N/A (Configuration within message structure)

### Endpoint
N/A

### Parameters
#### Request Body (Conceptual)
- **role** (string) - The role of the message sender (e.g., 'user', 'assistant').
- **content** (Array<Object>) - An array of message parts.
  - **type** (string) - The type of content part (e.g., 'text', 'image').
  - **text** (string) - The text content (for 'text' type).
  - **image** (string | ArrayBuffer | Uint8Array | Buffer | URL) - The image content (for 'image' type).
  - **providerOptions** (Object) - Provider-specific configurations.
    - **openai** (Object) - Options specific to OpenAI.
      - **imageDetail** (string) - Configuration for image detail ('low' or 'high').

### Request Example
```typescript
import { ModelMessage } from 'ai';

const messages: ModelMessage[] = [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Describe the image in detail.',
        providerOptions: {
          openai: { imageDetail: 'low' },
        },
      },
      {
        type: 'image',
        image:
          'https://github.com/vercel/ai/blob/main/examples/ai-core/data/comic-cat.png?raw=true',
        providerOptions: {
          openai: { imageDetail: 'low' },
        },
      },
    ],
  },
];
```

### Response
N/A (This describes message construction, not an API response.)
```

--------------------------------

### Render Persistent Data Parts by Type (React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/streaming-data

This snippet illustrates how to filter and render persistent data parts from the `message.parts` array within a React component. It shows examples of filtering for 'data-weather', 'text', and 'source' part types and rendering their respective data.

```tsx
const result = (
  <>
    {messages?.map(message => (
      <div key={message.id}>
        {/* Render weather data parts */}
        {message.parts
          .filter(part => part.type === 'data-weather')
          .map((part, index) => (
            <div key={index} className="weather-widget">
              {part.data.status === 'loading' ? (
                <>Getting weather for {part.data.city}...</>
              ) : (
                <>
                  Weather in {part.data.city}: {part.data.weather}
                </>
              )}
            </div>
          ))}

        {/* Render text content */}
        {message.parts
          .filter(part => part.type === 'text')
          .map((part, index) => (
            <div key={index}>{part.text}</div>
          ))}

        {/* Render sources */}
        {message.parts
          .filter(part => part.type === 'source')
          .map((part, index) => (
            <div key={index} className="source">
              Source: <a href={part.url}>{part.title}</a>
            </div>
          ))}
      </div>
    ))}
  </>
);

```

--------------------------------

### Add Custom Headers to Embedding Request (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/embeddings

This example illustrates how to attach custom HTTP headers to an embedding request made via the `embed` function. The `headers` parameter accepts a `Record<string, string>`, allowing for custom authentication, tracing, or other specific HTTP requirements.

```typescript
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

const { embedding } = await embed({
  model: openai.textEmbeddingModel('text-embedding-3-small'),
  value: 'sunny day at the beach',
  headers: { 'X-Custom-Header': 'custom-value' },
});
```

--------------------------------

### React Location Tool State Management

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot-with-tool-calling

Renders location request tool states including preparation, input-available (getting location), output-available (displaying location result), and output-error (showing error messages). Uses key-based rendering with callId for tool call tracking.

```typescript
case 'tool-getLocation': {
  const callId = part.toolCallId;
  switch (part.state) {
    case 'input-streaming':
      return (
        <div key={callId}>Preparing location request...</div>
      );
    case 'input-available':
      return <div key={callId}>Getting location...</div>;
    case 'output-available':
      return <div key={callId}>Location: {part.output}</div>;
    case 'output-error':
      return (
        <div key={callId}>
          Error getting location: {part.errorText}
        </div>
      );
  }
  break;
}
```

--------------------------------

### Route Handler for V5 Schema Interaction (TSX)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0-data

This example demonstrates a route handler that receives a v5 formatted message, upserts it into the v5 schema using `upsertMessage`, loads previous messages, and streams a response using `streamText`. It also handles saving the response message back to the v5 schema.

```tsx
import type { MyUIMessage } from './conversion';
import { upsertMessage, loadChat } from './db'; // Assuming these are in './db'
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, generateId } from './utils'; // Assuming these exist

export async function POST(req: Request) {
  const { message, chatId }: { message: MyUIMessage; chatId: string } = 
    await req.json();

  // Pass v5 message directly - no conversion needed
  await upsertMessage({
    chatId,
    id: message.id,
    message,
  });

  const previousMessages = await loadChat(chatId);
  const messages = [...previousMessages, message];

  const result = streamText({
    model: openai('gpt-4'),
    messages: convertToModelMessages(messages),
    tools: {
      // Your tools here
    },
  });

  return result.toUIMessageStreamResponse({
    generateMessageId: generateId,
    originalMessages: messages,
    onFinish: async ({ responseMessage }) => {
      await upsertMessage({
        chatId,
        id: responseMessage.id,
        message: responseMessage, // No conversion needed
      });
    },
  });
```

--------------------------------

### Import Completion for Svelte

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/use-completion

Imports the `Completion` component from the `@ai-sdk/svelte` library for Svelte applications. This import is necessary to utilize the text completion functionalities provided by the AI SDK in Svelte projects.

```javascript
import { Completion } from '@ai-sdk/svelte'
```

--------------------------------

### Display Multi-Step Tool Call Boundaries in React (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot-with-tool-calling

This React snippet shows how to render visual boundaries for multi-step tool calls using `step-start` parts in assistant messages. It checks for `step-start` part types and conditionally renders a horizontal rule to indicate the start of a new step, enhancing user comprehension of multi-step processes.

```typescript
// ...
// where you render the message parts:
message.parts.map((part, index) => {
  switch (part.type) {
    case 'step-start':
      // show step boundaries as horizontal lines:
      return index > 0 ? (
        <div key={index} className="text-gray-500">
          <hr className="my-2 border-gray-300" />
        </div>
      ) : null;
    case 'text':
    // ...
    case 'tool-askForConfirmation':
    case 'tool-getLocation':
    case 'tool-getWeatherInformation':
    // ...
  }
});
// ...
```

--------------------------------

### Execute a Specific AI SDK Codemod by Name

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This command illustrates how to run an individual codemod by specifying its name and an optional path. This is useful for applying targeted transformations to specific parts of your codebase.

```sh
npx @ai-sdk/codemod <codemod-name> <path>
```

--------------------------------

### Define and Add a New Stock Tool (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces

Demonstrates how to define a new custom tool for stock price retrieval using `createTool`. It includes defining the tool's description, input schema with Zod, and an asynchronous execution function. The new tool is then added to the existing `tools` object.

```typescript
// Add a new stock tool
export const stockTool = createTool({
  description: 'Get price for a stock',
  inputSchema: z.object({
    symbol: z.string().describe('The stock symbol to get the price for'),
  }),
  execute: async function ({ symbol }) {
    // Simulated API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { symbol, price: 100 };
  },
});

// Update the tools object
export const tools = {
  displayWeather: weatherTool,
  getStockPrice: stockTool,
};

```

--------------------------------

### Generate Text with Common Settings (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/settings

Demonstrates how to use common settings like maxOutputTokens, temperature, maxRetries, and prompt with the generateText function.

```typescript
const result = await generateText({
  model: 'openai/gpt-4.1',
  maxOutputTokens: 512,
  temperature: 0.3,
  maxRetries: 5,
  prompt: 'Invent a new holiday and describe its traditions.',
});
```

--------------------------------

### Define a Zod Schema for AI SDK Tool Input

Source: https://v6.ai-sdk.dev/docs/foundations/tools

This TypeScript example demonstrates how to define a Zod schema for complex tool inputs, such as a recipe object with nested properties. This schema serves as the `inputSchema` for an AI SDK tool, validating arguments passed by the LLM before tool execution.

```typescript
import z from 'zod';

const recipeSchema = z.object({
  recipe: z.object({
    name: z.string(),
    ingredients: z.array(
      z.object({
        name: z.string(),
        amount: z.string(),
      }),
    ),
    steps: z.array(z.string()),
  }),
});
```

--------------------------------

### Stream UI with Tool Integration for Weather Component (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/streaming-react-components

Shows how to integrate a custom tool ('getWeather') with the streamUI function. This example defines the tool's description, input schema using Zod, and a generator function for asynchronous data fetching and component rendering. It includes a loading state and the final WeatherComponent.

```tsx
const result = await streamUI({
  model: openai('gpt-5-mini'),
  prompt: 'Get the weather for San Francisco',
  text: ({ content }) => <div>{content}</div>,
  tools: {
    getWeather: {
      description: 'Get the weather for a location',
      inputSchema: z.object({ location: z.string() }),
      generate: async function* ({ location }) {
        yield <LoadingComponent />;
        const weather = await getWeather(location);
        return <WeatherComponent weather={weather} location={location} />;
      },
    },
  },
});
```

--------------------------------

### Stream Custom Data from Server using AI SDK

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/streaming-data

Implement a server-side route handler to create and stream custom data using `createUIMessageStream` and `createUIMessageStreamResponse`. This example demonstrates sending transient notifications, source data, and updatable weather data parts, integrating with `streamText` for model responses. It requires the '@ai-sdk/openai' and 'ai' libraries.

```tsx
import {
  openai
} from '@ai-sdk/openai';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
} from 'ai';
import type { MyUIMessage } from '@/ai/types';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = createUIMessageStream<MyUIMessage>({
    execute: ({ writer }) => {
      // 1. Send initial status (transient - won't be added to message history)
      writer.write({
        type: 'data-notification',
        data: { message: 'Processing your request...', level: 'info' },
        transient: true, // This part won't be added to message history
      });

      // 2. Send sources (useful for RAG use cases)
      writer.write({
        type: 'source',
        value: {
          type: 'source',
          sourceType: 'url',
          id: 'source-1',
          url: 'https://weather.com',
          title: 'Weather Data Source',
        },
      });

      // 3. Send data parts with loading state
      writer.write({
        type: 'data-weather',
        id: 'weather-1',
        data: { city: 'San Francisco', status: 'loading' },
      });

      const result = streamText({
        model: openai('gpt-4.1'),
        messages: convertToModelMessages(messages),
        onFinish() {
          // 4. Update the same data part (reconciliation)
          writer.write({
            type: 'data-weather',
            id: 'weather-1', // Same ID = update existing part
            data: {
              city: 'San Francisco',
              weather: 'sunny',
              status: 'success',
            },
          });

          // 5. Send completion notification (transient)
          writer.write({
            type: 'data-notification',
            data: { message: 'Request completed', level: 'info' },
            transient: true, // Won't be added to message history
          });
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}

```

--------------------------------

### Create AI Context for Server Actions (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/multistep-interfaces

This code snippet sets up the AI context using createAI from '@ai-sdk/rsc'. It initializes the UI and AI states and registers the submitUserMessage server action, making it available for use within the application.

```ts
import { createAI } from '@ai-sdk/rsc';
import { submitUserMessage } from './actions';

export const AI = createAI<any[], React.ReactNode[]>({
  initialUIState: [],
  initialAIState: [],
  actions: {
    submitUserMessage,
  },
});

```

--------------------------------

### Transform Messages in AI SDK Agent's prepareStep (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/loop-control

Shows how to modify messages before they are sent to the model using the `prepareStep` callback. This example includes summarizing lengthy tool results to reduce token usage, optimizing cost and performance by sending more concise information to the language model.

```ts
import { ToolLoopAgent } from 'ai';

const agent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  tools: {
    // your tools
  },
  prepareStep: async ({ messages, stepNumber }) => {
    // Summarize tool results to reduce token usage
    const processedMessages = messages.map(msg => {
      if (msg.role === 'tool' && msg.content.length > 1000) {
        return {
          ...msg,
          content: summarizeToolResult(msg.content),
        };
      }
      return msg;
    });

    return { messages: processedMessages };
  },
});

const result = await agent.generate({
  prompt: '...',
});
```

--------------------------------

### Install Zod Version 4.1.8 or Later using pnpm

Source: https://v6.ai-sdk.dev/docs/troubleshooting/typescript-performance-zod

This command upgrades the Zod library to version 4.1.8 or a later compatible version using the pnpm package manager. This is the primary solution to resolve TypeScript performance issues caused by module resolution conflicts with AI SDK 5.

```bash
pnpm add zod@^4.1.8
```

--------------------------------

### Import useChat Hook in AI SDK (v4 vs v5)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This snippet demonstrates the change in the import path for the 'useChat' hook. In AI SDK v4, 'useChat' was imported from 'ai/react'. In v5, it has been moved to the dedicated '@ai-sdk/react' package, necessitating an import path update and package installation.

```tsx
import { useChat } from 'ai/react';
```

```tsx
import { useChat } from '@ai-sdk/react';
```

--------------------------------

### Handle OpenAI Compatibility Mode Changes in AI SDK 4 and 5

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This example highlights the removal of the `compatibility` option in AI SDK 5. In AI SDK 4, users could explicitly set `compatibility: 'strict'`. AI SDK 5 makes strict compatibility the default behavior, thus rendering the option unnecessary.

```tsx
const openai = createOpenAI({
  compatibility: 'strict',
});
```

```tsx
const openai = createOpenAI({
  // strict compatibility is now the default
});
```

--------------------------------

### Include audio file in user messages

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

Shows how to include MP3 audio file content for OpenAI gpt-5-mini audio-preview model processing

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const result = await generateText({
  model: openai('gpt-5-mini-audio-preview'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What is the audio saying?' },
        {
          type: 'file',
          mediaType: 'audio/mpeg',
          data: fs.readFileSync('./data/galileo.mp3'),
        },
      ],
    },
  ],
});
```

--------------------------------

### Update AI SDK API Route with stopWhen Condition (TypeScript/Next.js)

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

This snippet demonstrates how to modify an `app/api/chat+api.ts` file to include the `stopWhen: stepCountIs(5)` condition within the `streamText` function. This configuration allows the AI model to perform up to 5 steps for any given generation, facilitating more complex interactions and enabling the model to process information over multiple stages. It also includes an initial 'weather' tool definition.

```tsx
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'openai/gpt-5.1',
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}
```

--------------------------------

### Setting Media Types in AI SDK Messages (v4 vs. v5)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This example illustrates how to specify media types for image and file content within AI SDK messages. Version 4 uses `mimeType`, which has been standardized to `mediaType` in Version 5 for consistency across different content types. It shows constructing a user message with both image and file parts.

```tsx
const result = await generateText({
  model: someModel,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What do you see?' },
        {
          type: 'image',
          image: new Uint8Array([0, 1, 2, 3]),
          mimeType: 'image/png',
        },
        {
          type: 'file',
          data: contents,
          mimeType: 'application/pdf',
        },
      ],
    },
  ],
});
```

```tsx
const result = await generateText({
  model: someModel,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What do you see?' },
        {
          type: 'image',
          image: new Uint8Array([0, 1, 2, 3]),
          mediaType: 'image/png',
        },
        {
          type: 'file',
          data: contents,
          mediaType: 'application/pdf',
        },
      ],
    },
  ],
});
```

--------------------------------

### Build Client-Side Approval UI for Tools (React)

Source: https://v6.ai-sdk.dev/docs/introduction/announcing-ai-sdk-6-beta

This React component demonstrates how to handle tool approval requests in a user interface. It renders different UI elements based on the `invocation.state`, allowing users to approve or deny tool executions and then submitting the response using `addToolApprovalResponse`.

```javascript
export function WeatherToolView({ invocation, addToolApprovalResponse }) {
  if (invocation.state === 'approval-requested') {
    return (
      <div>
        <p>Can I retrieve the weather for {invocation.input.city}?</p>
        <button
          onClick={() =>
            addToolApprovalResponse({
              id: invocation.approval.id,
              approved: true,
            })
          }
        >
          Approve
        </button>
        <button
          onClick={() =>
            addToolApprovalResponse({
              id: invocation.approval.id,
              approved: false,
            })
          }
        >
          Deny
        </button>
      </div>
    );
  }


  if (invocation.state === 'output-available') {
    return (
      <div>
        Weather: {invocation.output.weather}
        Temperature: {invocation.output.temperature}°F
      </div>
    );
  }


  // Handle other states...
}
```

--------------------------------

### Send File Objects with useChat Hook

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot

This example shows how to send files as objects directly with a message using the `useChat` hook. This is useful for pre-uploaded files or data URLs. The code defines an array of `FileUIPart` objects, each with type, filename, mediaType, and URL, and sends them along with text input. It depends on `@ai-sdk/react` and `ai` types.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { FileUIPart } from 'ai';

export default function Page() {
  const { messages, sendMessage, status } = useChat();

  const [input, setInput] = useState('');
  const [files] = useState<FileUIPart[]>([
    {
      type: 'file',
      filename: 'earth.png',
      mediaType: 'image/png',
      url: 'https://example.com/earth.png',
    },
    {
      type: 'file',
      filename: 'moon.png',
      mediaType: 'image/png',
      url: 'data:image/png;base64,iVBORw0KGgo...',
    },
  ]);

  return (
    <div>
      <div>
        {messages.map(message => (
          <div key={message.id}>
            <div>{`${message.role}: `}</div>

            <div>
              {message.parts.map((part, index) => {
                if (part.type === 'text') {
                  return <span key={index}>{part.text}</span>;
                }

                if (
                  part.type === 'file' &&
                  part.mediaType?.startsWith('image/')
                ) {
                  return <img key={index} src={part.url} alt={part.filename} />;
                }

                return null;
              })}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={event => {
          event.preventDefault();
          if (input.trim()) {
            sendMessage({
              text: input,
              files,
            });
            setInput('');
          }
        }}>
        <input
          value={input}
          placeholder="Send message..."
          onChange={e => setInput(e.target.value)}
          disabled={status !== 'ready'} />
      </form>
    </div>
  );
}

```

--------------------------------

### LangChain Stream Conversion API

Source: https://v6.ai-sdk.dev/docs/reference/stream-helpers/langchain-adapter

This section details the primary methods provided by the @ai-sdk/langchain module for converting LangChain output streams.

```APIDOC
## `@ai-sdk/langchain` API Methods

This module provides helper functions to transform LangChain output streams into data streams and data stream responses.

### Methods

#### `toDataStream`

- **Type**: `(stream: ReadableStream<LangChainAIMessageChunk> | ReadableStream<string>, AIStreamCallbacksAndOptions) => AIStream`
- **Description**: Converts LangChain output streams to data stream.

#### `toDataStreamResponse`

- **Type**: `(stream: ReadableStream<LangChainAIMessageChunk> | ReadableStream<string>, options?: {init?: ResponseInit, data?: StreamData, callbacks?: AIStreamCallbacksAndOptions}) => Response`
- **Description**: Converts LangChain output streams to a data stream response.

#### `mergeIntoDataStream`

- **Type**: `(stream: ReadableStream<LangChainStreamEvent> | ReadableStream<LangChainAIMessageChunk> | ReadableStream<string>, options: { dataStream: DataStreamWriter; callbacks?: StreamCallbacks }) => void`
- **Description**: Merges LangChain output streams into an existing data stream.
```

--------------------------------

### Convert Zod Schema to JSON Schema with Recursion - TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/zod-schema

This example demonstrates how to use zodSchema() to convert a recursive Zod schema into a JSON schema compatible with the AI SDK. It utilizes `z.lazy` for recursive definitions and `useReferences: true` to enable reference support, which is crucial for handling such schemas.

```typescript
import { zodSchema } from 'ai';
import { z } from 'zod';

// Define a base category schema
const baseCategorySchema = z.object({
  name: z.string(),
});

// Define the recursive Category type
type Category = z.infer<typeof baseCategorySchema> & {
  subcategories: Category[];
};

// Create the recursive schema using z.lazy
const categorySchema: z.ZodType<Category> = baseCategorySchema.extend({
  subcategories: z.lazy(() => categorySchema.array()),
});

// Create the final schema with useReferences enabled for recursive support
const mySchema = zodSchema(
  z.object({
    category: categorySchema,
  }),
  { useReferences: true },
);
```

--------------------------------

### Force Specific Tool Usage in AI SDK Agent (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/loop-control

Illustrates how to explicitly force the agent to use a specific tool at a particular step by setting the `toolChoice` property within the `prepareStep` callback. This is useful for guiding the agent through a predefined workflow or ensuring critical steps are handled by designated tools.

```ts
prepareStep: async ({ stepNumber }) => {
  if (stepNumber === 0) {
    // Force the search tool to be used first
    return {
      toolChoice: { type: 'tool', toolName: 'search' },
    };
  }

  if (stepNumber === 5) {
    // Force the summarize tool after analysis
    return {
      toolChoice: { type: 'tool', toolName: 'summarize' },
    };
  }

  return {};
};
```

--------------------------------

### Access Raw Response Headers and Body from generateText (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-text

This example demonstrates how to access the raw HTTP response details, including headers and body, from the `generateText` function's result object. This is useful for retrieving provider-specific information not directly exposed in the main result properties.

```ts
import { generateText } from 'ai';

const result = await generateText({
  // ...
});

console.log(JSON.stringify(result.response.headers, null, 2));
console.log(JSON.stringify(result.response.body, null, 2));
```

--------------------------------

### Create UI Message Stream with Merging - TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/create-ui-message-stream

Demonstrates creating a UI message stream using `createUIMessageStream`. This example includes writing text chunks, merging another stream generated by `streamText`, and configuring error and finish callbacks. It highlights how to manage message IDs for consistency across text segments.

```typescript
const existingMessages: UIMessage[] = [
  /* ... */
];

const stream = createUIMessageStream({
  async execute({ writer }) {
    // Start a text message
    // Note: The id must be consistent across text-start, text-delta, and text-end steps
    // This allows the system to correctly identify they belong to the same text block
    writer.write({
      type: 'text-start',
      id: 'example-text',
    });

    // Write a message chunk
    writer.write({
      type: 'text-delta',
      id: 'example-text',
      delta: 'Hello',
    });

    // End the text message
    writer.write({
      type: 'text-end',
      id: 'example-text',
    });

    // Merge another stream from streamText
    const result = streamText({
      model: openai('gpt-5-mini'),
      prompt: 'Write a haiku about AI',
    });

    writer.merge(result.toUIMessageStream());
  },
  onError: error => `Custom error: ${error.message}`,
  originalMessages: existingMessages,
  onFinish: ({ messages, isContinuation, responseMessage }) => {
    console.log('Stream finished with messages:', messages);
  },
});
```

--------------------------------

### Route Customer Queries with Contextual AI (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/workflows

This TypeScript function demonstrates routing customer queries by first classifying them based on type and complexity. It then dynamically selects the appropriate AI model and system prompt for generating a response, adapting to different query needs. It utilizes the 'ai' SDK and 'zod' for schema validation.

```typescript
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

async function handleCustomerQuery(query: string) {
  const model = 'openai/gpt-5-mini';

  // First step: Classify the query type
  const { object: classification } = await generateObject({
    model,
    schema: z.object({
      reasoning: z.string(),
      type: z.enum(['general', 'refund', 'technical']),
      complexity: z.enum(['simple', 'complex']),
    }),
    prompt: `Classify this customer query:
    ${query}

    Determine:
    1. Query type (general, refund, or technical)
    2. Complexity (simple or complex)
    3. Brief reasoning for classification`,
  });

  // Route based on classification
  // Set model and system prompt based on query type and complexity
  const { text: response } = await generateText({
    model:
      classification.complexity === 'simple'
        ? 'openai/gpt-5-mini'
        : 'openai/o4-mini',
    system: {
      general:
        'You are an expert customer service agent handling general inquiries.',
      refund:
        'You are a customer service agent specializing in refund requests. Follow company policy and collect necessary information.',
      technical:
        'You are a technical support specialist with deep product knowledge. Focus on clear step-by-step troubleshooting.',
    }[classification.type],
    prompt: query,
  });

  return { response, classification };
}
```

--------------------------------

### Attaching Usage Data as Metadata in AI SDK v5 (Server-side)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This server-side example for AI SDK v5 illustrates how to attach `LanguageModelUsage` data as custom metadata to messages. It defines a `MyMetadata` type for type safety and uses the `messageMetadata` function in `toUIMessageStreamResponse` to send `totalUsage` when generation is complete.

```tsx
import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  streamText,
  UIMessage,
  type LanguageModelUsage,
} from 'ai';

// Create a new metadata type (optional for type-safety)
type MyMetadata = {
  totalUsage: LanguageModelUsage;
};

// Create a new custom message type with your own metadata
export type MyUIMessage = UIMessage<MyMetadata>;

export async function POST(req: Request) {
  const { messages }: { messages: MyUIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-5-mini'),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    messageMetadata: ({ part }) => {
      // Send total usage when generation is finished
      if (part.type === 'finish') {
        return { totalUsage: part.totalUsage };
      }
    },
  });
}
```

--------------------------------

### Accessing Reasoning Properties in AI SDK `generateText` Results (v4 vs. v5)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This example shows how reasoning information is structured in the results of `generateText()` and `streamText()` calls. In Version 4, `result.reasoning` provided a string and `result.reasoningDetails` an array. In Version 5, `result.reasoningText` provides the string, and `result.reasoning` now refers to the array of details.

```tsx
const result = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt: 'Explain your reasoning',
});

console.log(result.reasoning); // String reasoning text
console.log(result.reasoningDetails); // Array of reasoning details
```

```tsx
const result = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt: 'Explain your reasoning',
});

console.log(result.reasoningText); // String reasoning text
console.log(result.reasoning); // Array of reasoning details
```

--------------------------------

### Create AI Embedding Logic File

Source: https://v6.ai-sdk.dev/docs/guides/rag-chatbot

This command creates the necessary directory structure and an empty TypeScript file where the embedding logic will reside. It's the first step to organize your AI-related code.

```bash
mkdir lib/ai && touch lib/ai/embedding.ts
```

--------------------------------

### Access Source Stream Chunks in AI SDK (TypeScript/TSX)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This example illustrates the streamlined access to source stream parts in AI SDK 5.0. In contrast to AI SDK 4.0, where `id`, `title`, and `url` were nested under a `source` property, AI SDK 5.0 makes these properties directly available on the `source` chunk, simplifying data retrieval.

```tsx
for await (const part of result.fullStream) {
  if (part.type === 'source' && part.source.sourceType === 'url') {
    console.log('ID:', part.source.id);
    console.log('Title:', part.source.title);
    console.log('URL:', part.source.url);
  }
}
```

```tsx
for await (const part of result.fullStream) {
  if (part.type === 'source' && part.sourceType === 'url') {
    console.log('ID:', part.id);
    console.log('Title:', part.title);
    console.log('URL:', part.url);
  }
}
```

--------------------------------

### Create UI Message Stream Response with Custom Data

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/create-ui-message-stream-response

Demonstrates how to create a streaming UI response using createUIMessageStreamResponse. It shows writing custom data, text content, source information, and merging with an LLM stream. This example utilizes 'ai' SDK components for stream manipulation and LLM integration.

```tsx
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';

const response = createUIMessageStreamResponse({
  status: 200,
  statusText: 'OK',
  headers: {
    'Custom-Header': 'value',
  },
  stream: createUIMessageStream({
    execute({ writer }) {
      // Write custom data
      writer.write({
        type: 'data',
        value: { message: 'Hello' },
      });

      // Write text content
      writer.write({
        type: 'text',
        value: 'Hello, world!',
      });

      // Write source information
      writer.write({
        type: 'source-url',
        value: {
          type: 'source',
          id: 'source-1',
          url: 'https://example.com',
          title: 'Example Source',
        },
      });

      // Merge with LLM stream
      const result = streamText({
        model: openai('gpt-4'),
        prompt: 'Say hello',
      });

      writer.merge(result.toUIMessageStream());
    },
  }),
});
```

--------------------------------

### Configure OpenAI API Key

Source: https://v6.ai-sdk.dev/docs/guides/multi-modal-chatbot

Adds the `OPENAI_API_KEY` environment variable to your `.env.local` file. Replace `xxxxxxxxx` with your actual OpenAI API key obtained from the OpenAI website. The AI SDK's OpenAI Provider will automatically pick up this key for authentication.

```env
OPENAI_API_KEY=xxxxxxxxx
```

--------------------------------

### Read and process streamable values on the client

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-rsc/read-streamable-value

This example demonstrates how to use readStreamableValue to consume a stream of data generated by the server. It iterates over the stream using 'for await...of' and updates the UI with each received delta. Ensure the 'generate' function is defined elsewhere to return a streamable value.

```tsx
import { readStreamableValue } from '@ai-sdk/rsc';

export default function Page() {
  const [generation, setGeneration] = useState('');

  return (
    <div>
      <button
        onClick={async () => {
          const stream = await generate();

          for await (const delta of readStreamableValue(stream)) {
            setGeneration(generation => generation + delta);
          }
        }}
      >
        Generate
      </button>
    </div>
  );
}
```

--------------------------------

### Generate Structured Output with AI SDK ToolLoopAgent

Source: https://v6.ai-sdk.dev/docs/introduction/announcing-ai-sdk-6-beta

This code demonstrates how to use the `ToolLoopAgent` to generate structured output alongside multi-step tool calling. It defines a `weather` tool and an `Output.object` schema for the agent's response, enabling the agent to execute the tool and return a structured summary of its findings.

```typescript
import { Output, ToolLoopAgent, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';


const agent = new ToolLoopAgent({
  model: openai('gpt-5-mini'),
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        city: z.string(),
      }),
      execute: async ({ city }) => {
        return { temperature: 72, condition: 'sunny' };
      },
    }),
  },
  output: Output.object({
    schema: z.object({
      summary: z.string(),
      temperature: z.number(),
      recommendation: z.string(),
    }),
  }),
});


const { output } = await agent.generate({
  prompt: 'What is the weather in San Francisco and what should I wear?',
});
console.log(output);
```

--------------------------------

### Access raw response headers and body from AI SDK generateObject (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-structured-data

This example shows how to access the underlying model provider's full response, including headers and body, after calling `generateObject`. The `result.response` property provides access to this raw data, useful for debugging or integrating with provider-specific features.

```ts
import { generateObject } from 'ai';

const result = await generateObject({
  // ...
});

console.log(JSON.stringify(result.response.headers, null, 2));
console.log(JSON.stringify(result.response.body, null, 2));
```

--------------------------------

### Create Next.js API Route Directory and File (Bash)

Source: https://v6.ai-sdk.dev/docs/guides/rag-chatbot

Use this bash command to create the necessary directory structure (app/api/chat) and an empty route.ts file for a Next.js API route handler. This prepares the file system for defining your chat API endpoint.

```bash
mkdir -p app/api/chat && touch app/api/chat/route.ts
```

--------------------------------

### Generate an Enum Value from a Predefined List (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/stream-object

This example demonstrates how to constrain the output of `streamObject` to a predefined set of enum values. It configures `output` to 'enum' and provides an array of possible string values. This ensures the language model's response for the given prompt will be one of the specified options, streamed via `partialObjectStream`.

```ts
import { streamObject } from 'ai';

const { partialObjectStream } = streamObject({
  model: 'openai/gpt-4.1',
  output: 'enum',
  enum: ['action', 'comedy', 'drama', 'horror', 'sci-fi'],
  prompt:
    'Classify the genre of this movie plot: ' +
    '"A group of astronauts travel through a wormhole in search of a ' +
    'new habitable planet for humanity."',
});
```

--------------------------------

### Convert UI Messages for AI Model Streaming (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages

This example demonstrates how to use `convertToModelMessages` within an API route to transform UI messages from the `useChat` hook into a format compatible with AI model functions like `streamText`. It integrates with `@ai-sdk/openai` for model interaction and `ai` for core utilities.

```typescript
import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-5-mini'),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

--------------------------------

### Complete Chat Component with Data Handling (React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/streaming-data

This is a comprehensive React component example demonstrating a chat interface that utilizes `useChat`. It includes sending user messages, receiving and displaying AI responses, handling transient notifications via `onData`, and rendering persistent data parts like weather updates and text content.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import type { MyUIMessage } from '@/ai/types';

export default function Chat() {
  const [input, setInput] = useState('');

  const { messages, sendMessage } = useChat<MyUIMessage>({
    api: '/api/chat',
    onData: dataPart => {
      // Handle transient notifications
      if (dataPart.type === 'data-notification') {
        console.log('Notification:', dataPart.data.message);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <>
      {messages?.map(message => (
        <div key={message.id}>
          {message.role === 'user' ? 'User: ' : 'AI: '}

          {/* Render weather data */}
          {message.parts
            .filter(part => part.type === 'data-weather')
            .map((part, index) => (
              <span key={index} className="weather-update">
                {part.data.status === 'loading' ? (
                  <>Getting weather for {part.data.city}...</>
                ) : (
                  <>
                    Weather in {part.data.city}: {part.data.weather}
                  </>
                )}
              </span>
            ))}

          {/* Render text content */}
          {message.parts
            .filter(part => part.type === 'text')
            .map((part, index) => (
              <div key={index}>{part.text}</div>
            ))}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about the weather..."
        />
        <button type="submit">Send</button>
      </form>
    </>
  );
}

```

--------------------------------

### Throttling UI Updates for useCompletion (React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/completion

This example shows how to use the `experimental_throttle` option with the `useCompletion` hook to limit how frequently the UI updates with new text chunks. Setting this option to a value like `50` (milliseconds) can improve performance by reducing unnecessary re-renders during streaming.

```tsx
const { completion, ... } = useCompletion({
  // Throttle the completion and data updates to 50ms:
  experimental_throttle: 50
})

```

--------------------------------

### Handle errors in AI SDK streamObject with onError callback (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-structured-data

When using `streamObject`, errors become part of the stream to prevent crashes. This example demonstrates how to provide an `onError` callback to `streamObject` to catch and log any errors that occur during the streaming process, allowing for custom error handling logic.

```ts
import { streamObject } from 'ai';

const result = streamObject({
  // ...
  onError({ error }) {
    console.error(error); // your error logging logic here
  },
});
```

--------------------------------

### Discover MCP Tools Schema (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

This code demonstrates how to use schema discovery to automatically list all tools offered by the MCP server. Parameter types are inferred, simplifying implementation but foregoing TypeScript type safety.

```typescript
const tools = await mcpClient.tools();
```

--------------------------------

### Add Temperature Conversion Tool to AI Agent (TypeScript)

Source: https://v6.ai-sdk.dev/docs/getting-started/nodejs

This TypeScript code updates an `index.ts` file to integrate a new `convertFahrenheitToCelsius` tool into an `ai-sdk` powered conversational agent. The tool takes a temperature in Fahrenheit and returns it in Celsius, utilizing `zod` for input validation. This enables the agent to perform multi-step operations, such as fetching weather data and then converting its temperature units.

```ts
import { ModelMessage, streamText, tool, stepCountIs } from 'ai';
import 'dotenv/config';
import { z } from 'zod';
import * as readline from 'node:readline/promises';

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: ModelMessage[] = [];

async function main() {
  while (true) {
    const userInput = await terminal.question('You: ');

    messages.push({ role: 'user', content: userInput });

    const result = streamText({
      model: 'openai/gpt-5.1',
      messages,
      tools: {
        weather: tool({
          description: 'Get the weather in a location (fahrenheit)',
          inputSchema: z.object({
            location: z
              .string()
              .describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => {
            const temperature = Math.round(Math.random() * (90 - 32) + 32);
            return {
              location,
              temperature,
            };
          },
        }),
        convertFahrenheitToCelsius: tool({
          description: 'Convert a temperature in fahrenheit to celsius',
          inputSchema: z.object({
            temperature: z
              .number()
              .describe('The temperature in fahrenheit to convert'),
          }),
          execute: async ({ temperature }) => {
            const celsius = Math.round((temperature - 32) * (5 / 9));
            return {
              celsius,
            };
          },
        }),
      },
      stopWhen: stepCountIs(5),
      onStepFinish: async ({ toolResults }) => {
        if (toolResults.length) {
          console.log(JSON.stringify(toolResults, null, 2));
        }
      },
    });

    let fullResponse = '';
    process.stdout.write('\nAssistant: ');
    for await (const delta of result.textStream) {
      fullResponse += delta;
      process.stdout.write(delta);
    }
    process.stdout.write('\n\n');

    messages.push({ role: 'assistant', content: fullResponse });
  }
}

main().catch(console.error);
```

--------------------------------

### Generate JSON for UI Rendering - TypeScript

Source: https://v6.ai-sdk.dev/docs/advanced/rendering-ui-with-language-models

This example shows how to configure a tool within `generateText` to return a JSON object instead of plain text. The `getWeather` tool's `execute` function returns a structured object containing weather details, which can then be used to render a React component.

```tsx
const text = generateText({
  model: openai('gpt-3.5-turbo'),
  system: 'You are a friendly assistant',
  prompt: 'What is the weather in SF?',
  tools: {
    getWeather: {
      description: 'Get the weather for a location',
      parameters: z.object({
        city: z.string().describe('The city to get the weather for'),
        unit:
          z
            .enum(['C', 'F'])
            .describe('The unit to display the temperature in'),
      }),
      execute: async ({ city, unit }) => {
        const weather = getWeather({ city, unit });
        const { temperature, unit, description, forecast } = weather;

        return {
          temperature,
          unit,
          description,
          forecast,
        };
      },
    },
  },
});
```

--------------------------------

### Run AI SDK Codemods for Upgrade

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-4-0

Commands to execute codemods for upgrading the AI SDK. This includes running all upgrade codemods, only v4 codemods, or specific codemods by name and path.

```sh
npx @ai-sdk/codemod upgrade

```

```sh
npx @ai-sdk/codemod v4

```

```sh
npx @ai-sdk/codemod <codemod-name> <path>

```

```sh
npx @ai-sdk/codemod v4/replace-baseurl src/

```

--------------------------------

### Server Action using `render` function with OpenAI

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-3-1

This Server Action demonstrates how to use the `render` function from the AI SDK RSC API with the OpenAI provider. It requires setting up an OpenAI provider instance and defining tools with a `render` key for React Server Components. This method is suitable for direct OpenAI integration.

```tsx
import { render } from '@ai-sdk/rsc';
import OpenAI from 'openai';
import { z } from 'zod';
import { Spinner, Weather } from '@/components';
import { getWeather } from '@/utils';

const openai = new OpenAI();

async function submitMessage(userInput = 'What is the weather in SF?') {
  'use server';

  return render({
    provider: openai,
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: userInput },
    ],
    text: ({ content }) => <p>{content}</p>,
    tools: {
      get_city_weather: {
        description: 'Get the current weather for a city',
        parameters: z
          .object({
            city: z.string().describe('the city'),
          })
          .required(),
        render: async function* ({ city }) {
          yield <Spinner />;
          const weather = await getWeather(city);
          return <Weather info={weather} />;
        },
      },
    },
  });
}
```

--------------------------------

### Generate Unstructured JSON Object without Schema (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/stream-object

This example illustrates using `streamObject` to generate a JSON object without providing a specific Zod schema. By setting `output` to 'no-schema', the language model is allowed to return an arbitrary JSON structure for the given prompt, streaming partial objects via `partialObjectStream`.

```ts
import { openai } from '@ai-sdk/openai';
import { streamObject } from 'ai';

const { partialObjectStream } = streamObject({
  model: openai('gpt-4.1'),
  output: 'no-schema',
  prompt: 'Generate a lasagna recipe.',
});

for await (const partialObject of partialObjectStream) {
  console.clear();
  console.log(partialObject);
}
```

--------------------------------

### Define Tool Message with Tool Result Content in AI SDK (JavaScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

This comprehensive example demonstrates how to structure a 'tool' role message in the AI SDK, which is used to provide the output of a tool call back to the model. It includes the `toolCallId` to link to the corresponding assistant tool call, the `toolName`, and the `output` containing the result data. This structure supports both single and parallel tool call results.

```javascript
const result = await generateText({
  model: 'openai/gpt-4.1',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'How many calories are in this block of cheese?',
        },
        { type: 'image', image: fs.readFileSync('./data/roquefort.jpg') },
      ],
    },
    {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId: '12345',
          toolName: 'get-nutrition-data',
          input: { cheese: 'Roquefort' },
        },
        // there could be more tool calls here (parallel calling)
      ],
    },
    {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: '12345', // needs to match the tool call id
          toolName: 'get-nutrition-data',
          output: {
            type: 'json',
            value: {
              name: 'Cheese, roquefort',
              calories: 369,
              fat: 31,
              protein: 22,
            },
          },
        },
        // there could be more tool results here (parallel calling)
      ],
    },
  ],
});
```

--------------------------------

### Load Chat from DB using `onGetUIState` Callback

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui

This AI SDK RSC configuration uses the `onGetUIState` callback to load a chat from the database. It fetches the chat, converts it to the appropriate UI state format, and returns it for use with the `useUIState` hook.

```ts
import { createAI } from '@ai-sdk/rsc';
import { loadChatFromDB, convertToUIState } from '@/utils/queries';

export const AI = createAI({
  actions: {
    // server actions
  },
  onGetUIState: async () => {
    'use server';

    const chat = await loadChatFromDB();
    const uiState = convertToUIState(chat);

    return uiState;
  },
});
```

--------------------------------

### Create and Stream Multiple UIs with Other Data (React Server Components)

Source: https://v6.ai-sdk.dev/docs/advanced/multiple-streamables

This example demonstrates how to create two independent streamable UIs (weather and forecast) and return them along with other data (requestedAt) in a single server action. It uses `createStreamableUI` from '@ai-sdk/rsc' to manage UI updates and completion. The `getWeather` function simulates fetching data and updating the respective streamable UIs.

```tsx
'use server';

import { createStreamableUI } from '@ai-sdk/rsc';

export async function getWeather() {
  const weatherUI = createStreamableUI();
  const forecastUI = createStreamableUI();

  weatherUI.update(<div>Loading weather...</div>);
  forecastUI.update(<div>Loading forecast...</div>);

  getWeatherData().then(weatherData => {
    weatherUI.done(<div>{weatherData}</div>);
  });

  getForecastData().then(forecastData => {
    forecastUI.done(<div>{forecastData}</div>);
  });

  // Return both streamable UIs and other data fields.
  return {
    requestedAt: Date.now(),
    weather: weatherUI.value,
    forecast: forecastUI.value,
  };
}
```

--------------------------------

### Configure Maximum Serverless Function Duration in Next.js

Source: https://v6.ai-sdk.dev/docs/advanced/vercel-deployment-guide

This code snippet demonstrates how to configure the maximum execution duration for a Vercel serverless function in a Next.js application. This is crucial for AI applications that might exceed the default 10-second limit for LLM responses. The `maxDuration` export allows you to specify the timeout in seconds.

```typescript
export const maxDuration = 30;
```

--------------------------------

### Configuring defaultSettingsMiddleware - TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/default-settings-middleware

Demonstrates how to configure the defaultSettingsMiddleware with specific settings such as temperature and maxOutputTokens. These settings will be applied by default to subsequent language model calls.

```typescript
const middleware = defaultSettingsMiddleware({
  settings: {
    temperature: 0.7,
    maxOutputTokens: 1000,
    // other settings...
  },
});
```

--------------------------------

### Update AI SDK React Chat Frontend Component (pages/index.tsx)

Source: https://v6.ai-sdk.dev/docs/getting-started/nextjs-pages-router

This TSX code updates the `Chat` React component to correctly display messages from an AI SDK chatbot. It renders user and AI messages, specifically handling `text` parts and `tool-weather` or `tool-convertFahrenheitToCelsius` tool call parts by displaying their JSON output. The component also includes an input field for users to send messages to the AI and manage the input state.

```tsx
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(message => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <div key={`${message.id}-${i}`}>{part.text}</div>;
              case 'tool-weather':
              case 'tool-convertFahrenheitToCelsius':
                return (
                  <pre key={`${message.id}-${i}`}>
                    {JSON.stringify(part, null, 2)}
                  </pre>
                );
            }
          })}
        </div>
      ))}

      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={e => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
```

--------------------------------

### Migrating Search Grounding to Google Search Tool (AI SDK)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This snippet demonstrates the change in how search grounding is configured in AI SDK. Version 4.0 uses 'useSearchGrounding' directly within the model options, while version 5.0 introduces a dedicated 'google.tools.googleSearch' tool within the 'tools' option for explicit tool definition.

```tsx
const { text, providerMetadata } = await generateText({
  model: google('gemini-1.5-pro', {
    useSearchGrounding: true,
  }),
  prompt: 'List the top 5 San Francisco news from the past week.',
});
```

```tsx
import { google } from '@ai-sdk/google';
const { text, sources, providerMetadata } = await generateText({
  model: google('gemini-1.5-pro'),
  prompt:
    'List the top 5 San Francisco news from the past week.',
  tools: {
    google_search: google.tools.googleSearch({}),
  },
});
```

--------------------------------

### TypeScript: Multi-modal Tool Results (Experimental)

Source: https://v6.ai-sdk.dev/docs/foundations/prompts

Illustrates how to provide multi-part and multi-modal tool results, primarily for models that support experimental features like Anthropic. This allows tool outputs to include both text and media, such as images, enhancing the richness of the AI's responses.

```typescript
const result = await generateText({
  model: 'openai/gpt-4.1',
  messages: [
    // ...
    {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: '12345', // needs to match the tool call id
          toolName: 'get-nutrition-data',
          // for models that do not support multi-part tool results,
          // you can include a regular output part:
          output: {
            type: 'json',
            value: {
              name: 'Cheese, roquefort',
              calories: 369,
              fat: 31,
              protein: 22
            }
          }
        },
        {
          type: 'tool-result',
          toolCallId: '12345', // needs to match the tool call id
          toolName: 'get-nutrition-data',
          // for models that support multi-part tool results,
          // you can include a multi-part content part:
          output: {
            type: 'content',
            value: [
              {
                type: 'text',
                text: 'Here is an image of the nutrition data for the cheese:'
              },
              {
                type: 'media',
                data: fs
                  .readFileSync('./data/roquefort-nutrition-data.png')
                  .toString('base64'),
                mediaType: 'image/png'
              }
            ]
          }
        }
      ]
    }
  ]
});
```

--------------------------------

### Stream UI with Tool Calls using RSC

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui

This example shows how to use the 'streamUI' function from '@ai-sdk/rsc' in a React Server Component (RSC) context to generate UI elements based on tool outputs. It defines a 'displayWeather' tool that fetches weather data and renders a 'Weather' component. This approach allows for embedding dynamic UI directly within server actions.

```tsx
import { z } from 'zod';
import { streamUI } from '@ai-sdk/rsc';
import { openai } from '@ai-sdk/openai';
import { getWeather } from '@/utils/queries';
import { Weather } from '@/components/weather';

const { value: stream } = await streamUI({
  model: openai('gpt-5-mini'),
  system: 'you are a friendly assistant!',
  messages,
  text: async function* ({ content, done }) {
    // process text
  },
  tools: {
    displayWeather: {
      description: 'Display the weather for a location',
      inputSchema: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
      generate: async function* ({ latitude, longitude }) {
        yield <div>Loading weather...</div>;

        const { value, unit } = await getWeather({ latitude, longitude });

        return <Weather value={value} unit={unit} />;
      },
    },
  },
});
```

--------------------------------

### Build Chat Interface with useChat Hook in React Native Expo

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

Implements a complete chat interface using the AI SDK's useChat hook with React Native components. The component manages chat messages, user input, and form submission while displaying messages with their parts (text, reasoning tokens, etc.). Uses expo/fetch for streaming responses and includes error handling and auto-focus on the input field.

```tsx
import { generateAPIUrl } from '@/utils';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { useState } from 'react';
import { View, TextInput, ScrollView, Text, SafeAreaView } from 'react-native';

export default function App() {
  const [input, setInput] = useState('');
  const { messages, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl('/api/chat'),
    }),
    onError: error => console.error(error, 'ERROR'),
  });

  if (error) return <Text>{error.message}</Text>;

  return (
    <SafeAreaView style={{ height: '100%' }}>
      <View
        style={{
          height: '95%',
          display: 'flex',
          flexDirection: 'column',
          paddingHorizontal: 8,
        }}
      >
        <ScrollView style={{ flex: 1 }}>
          {messages.map(m => (
            <View key={m.id} style={{ marginVertical: 8 }}>
              <View>
                <Text style={{ fontWeight: 700 }}>{m.role}</Text>
                {m.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      return <Text key={`${m.id}-${i}`}>{part.text}</Text>;
                  }
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={{ marginTop: 8 }}>
          <TextInput
            style={{ backgroundColor: 'white', padding: 8 }}
            placeholder="Say something..."
            value={input}
            onChange={e => setInput(e.nativeEvent.text)}
            onSubmitEditing={e => {
              e.preventDefault();
              sendMessage({ text: input });
              setInput('');
            }}
            autoFocus={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
```

--------------------------------

### Execute All AI SDK Codemods for General Upgrade

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This shell command runs all available codemods provided by the AI SDK to assist with a general project upgrade. It's a comprehensive approach to automatically transform your codebase for various changes.

```sh
npx @ai-sdk/codemod upgrade
```

--------------------------------

### Send Messages using useActions Hook (React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui

This 'Before' example demonstrates using the `useActions` hook from '@ai-sdk/rsc' to send messages and update the UI state. It's intended for scenarios where components need to trigger server actions and then reflect the response in the UI. Requires the component to be a descendant of the `<AI/>` context provider.

```tsx
'use client';

import { useActions, useUIState } from '@ai-sdk/rsc';

export function ListFlights({ flights }) {
  const { sendMessage } = useActions();
  const [_, setMessages] = useUIState();

  return (
    <div>
      {flights.map(flight => (
        <div
          key={flight.id}
          onClick={async () => {
            const response = await sendMessage(
              `I would like to choose flight ${flight.id}!`
            );

            setMessages(msgs => [...msgs, response]);
          }}
        >
          {flight.name}
        </div>
      ))}
    </div>
  );
}

```

--------------------------------

### Stream an Array of Objects with Zod Schema and Element Stream (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/stream-object

This example shows how to stream an array of structured objects using `streamObject`. It defines a Zod schema for individual array elements (e.g., hero descriptions) and sets the `output` to 'array'. The `elementStream` is then used to process complete elements as they become available from the language model.

```ts
import { openai } from '@ai-sdk/openai';
import { streamObject } from 'ai';
import { z } from 'zod';

const { elementStream } = streamObject({
  model: openai('gpt-4.1'),
  output: 'array',
  schema: z.object({
    name: z.string(),
    class: z
      .string()
      .describe('Character class, e.g. warrior, mage, or thief.'),
    description: z.string(),
  }),
  prompt: 'Generate 3 hero descriptions for a fantasy role playing game.',
});

for await (const hero of elementStream) {
  console.log(hero);
}
```

--------------------------------

### Hook-Level Configuration with Resolvable Functions

Source: https://v6.ai-sdk.dev/docs/troubleshooting/use-chat-custom-request-options

This example demonstrates using functions within `DefaultChatTransport` at the hook level to provide dynamic configuration values. While functional, request-level configuration is generally preferred for dynamic data. This approach can use functions to resolve values like authentication tokens, user IDs, session IDs, and conditional credentials.

```tsx
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const { messages, sendMessage } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    headers: () => ({
      Authorization: `Bearer ${getAuthToken()}`,
      'X-User-ID': getCurrentUserId(),
    }),
    body: () => ({
      sessionId: getCurrentSessionId(),
      preferences: getUserPreferences(),
    }),
    credentials: () => (isAuthenticated() ? 'include' : 'same-origin'),
  }),
});
```

--------------------------------

### Implement a Default ToolLoopAgent for Weather Assistance

Source: https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta

This code snippet demonstrates the default implementation of a `ToolLoopAgent` using `@ai-sdk/openai`. It configures an agent with a specific model, instructions, and a custom `weatherTool` to automatically handle the tool execution loop for weather-related prompts.

```typescript
import { openai } from '@ai-sdk/openai';
import { ToolLoopAgent } from 'ai';
import { weatherTool } from '@/tool/weather';

export const weatherAgent = new ToolLoopAgent({
  model: openai('gpt-5-mini'),
  instructions: 'You are a helpful weather assistant.',
  tools: {
    weather: weatherTool,
  },
});

// Use the agent
const result = await weatherAgent.generate({
  prompt: 'What is the weather in San Francisco?',
});
```

--------------------------------

### Generate Text with System Prompt using AI SDK Core (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-text

This code illustrates generating text with a more advanced prompt that includes a 'system' role. The system prompt instructs the model to act as a professional writer, ensuring the generated summary is simple, clear, and concise. It requires an `article` variable to be defined.

```tsx
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'openai/gpt-4.1',
  system:
    'You are a professional writer. ' +
    'You write simple, clear, and concise content.',
  prompt: `Summarize the following article in 3-5 sentences: ${article}`,
});
```

--------------------------------

### TypeScript: AI Route Handler with getInformation Tool

Source: https://v6.ai-sdk.dev/docs/guides/rag-chatbot

This TypeScript code defines an API route handler that uses an AI model ('gpt-5-mini') to process messages, incorporating custom tools to extend its capabilities. It integrates the previously defined `findRelevantContent` function as a new `getInformation` tool, enabling the AI to query a knowledge base for answers. The handler also includes a `system` prompt to guide the AI's behavior and streams responses back to the user.

```typescript
import { createResource } from '@/lib/actions/resources';
import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  streamText,
  tool,
  UIMessage,
  stepCountIs,
} from 'ai';
import { z } from 'zod';
import { findRelevantContent } from '@/lib/ai/embedding';


// Allow streaming responses up to 30 seconds
export const maxDuration = 30;


export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();


  const result = streamText({
    model: openai('gpt-5-mini'),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    system: `You are a helpful assistant. Check your knowledge base before answering any questions.
    Only respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry, I don't know."`,
    tools: {
      addResource: tool({
        description: `add a resource to your knowledge base.
          If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
        inputSchema: z.object({
          content: z
            .string()
            .describe('the content or resource to add to the knowledge base'),
        }),
        execute: async ({ content }) => createResource({ content }),
      }),
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        inputSchema: z.object({
          question: z.string().describe('the users question'),
        }),
        execute: async ({ question }) => findRelevantContent(question),
      }),
    },
  });


  return result.toUIMessageStreamResponse();
}
```

--------------------------------

### Update LanguageModelV3StreamPart Type Definition (AI SDK)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

The `LanguageModelV3StreamPart` type has been significantly expanded in AI SDK 5.0 to support a new streaming architecture. This update introduces detailed `start`/`delta`/`end` patterns with IDs for text, reasoning, and tool input, as well as new lifecycle events and enhanced tool call structures compared to the simpler V4 definitions.

```tsx
// V4: Simple stream parts
type LanguageModelV3StreamPart =
  | { type: 'text-delta'; textDelta: string }
  | { type: 'reasoning'; text: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; input: string };
```

```tsx
// V5: Enhanced stream parts with IDs and lifecycle events
type LanguageModelV3StreamPart =
  // Text blocks with start/delta/end pattern
  | {
      type: 'text-start';
      id: string;
      providerMetadata?: SharedV2ProviderMetadata;
    }
  | {
      type: 'text-delta';
      id: string;
      delta: string;
      providerMetadata?: SharedV2ProviderMetadata;
    }
  | {
      type: 'text-end';
      id: string;
      providerMetadata?: SharedV2ProviderMetadata;
    }

  // Reasoning blocks with start/delta/end pattern
  | {
      type: 'reasoning-start';
      id: string;
      providerMetadata?: SharedV2ProviderMetadata;
    }
  | {
      type: 'reasoning-delta';
      id: string;
      delta: string;
      providerMetadata?: SharedV2ProviderMetadata;
    }
  | {
      type: 'reasoning-end';
      id: string;
      providerMetadata?: SharedV2ProviderMetadata;
    }

  // Tool input streaming
  | {
      type: 'tool-input-start';
      id: string;
      toolName: string;
      providerMetadata?: SharedV2ProviderMetadata;
    }
  | {
      type: 'tool-input-delta';
      id: string;
      delta: string;
      providerMetadata?: SharedV2ProviderMetadata;
    }
  | {
      type: 'tool-input-end';
      id: string;
      providerMetadata?: SharedV2ProviderMetadata;
    }

  // Enhanced tool calls
  | {
      type: 'tool-call';
      toolCallId: string;
      toolName: string;
      input: string;
      providerMetadata?: SharedV2ProviderMetadata;
    }

  // Stream lifecycle events
  | { type: 'stream-start'; warnings: Array<LanguageModelV3CallWarning> }
  | {
      type: 'finish';
      usage: LanguageModelV3Usage;
      finishReason: LanguageModelV3FinishReason;
      providerMetadata?: SharedV2ProviderMetadata;
    };
```

--------------------------------

### Send Message Metadata from Server using AI SDK

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/message-metadata

Send message metadata from your server-side API endpoint during the streaming process. The `messageMetadata` callback in `toUIMessageStreamResponse` allows you to return metadata objects based on different streaming stages like 'start' and 'finish'. Ensure `originalMessages` are passed for type safety.

```ts
import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, streamText } from 'ai';
import type { MyUIMessage } from '@/types';

export async function POST(req: Request) {
  const { messages }: { messages: MyUIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-5-mini'),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages, // pass this in for type-safe return objects
    messageMetadata: ({ part }) => {
      // Send metadata when streaming starts
      if (part.type === 'start') {
        return {
          createdAt: Date.now(),
          model: 'gpt-5-mini',
        };
      }

      // Send additional metadata when streaming completes
      if (part.type === 'finish') {
        return {
          totalTokens: part.totalUsage.totalTokens,
        };
      }
    },
  });
}
```

--------------------------------

### Advanced UI Message Validation with Schemas and Tools

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/safe-validate-ui-messages

This advanced example showcases `safeValidateUIMessages` with custom schemas for metadata and data parts, as well as defining and using tools. It illustrates how to structure messages with complex parts, apply Zod schemas for validation, and integrate tool definitions for comprehensive validation. The output handles both successful validation and potential errors.

```typescript
import { safeValidateUIMessages, tool } from 'ai';
import { z } from 'zod';

// Define schemas
const metadataSchema = z.object({
  timestamp: z.string().datetime(),
  userId: z.string(),
});

const dataSchemas = {
  chart: z.object({
    data: z.array(z.number()),
    labels: z.array(z.string()),
  }),
  image: z.object({
    url: z.string().url(),
    caption: z.string(),
  }),
};

const tools = {
  weather: tool({
    description: 'Get weather info',
    parameters: z.object({
      location: z.string(),
    }),
    execute: async ({ location }) => `Weather in ${location}: sunny`,
  }),
};

// Messages with custom parts
const messages = [
  {
    id: '1',
    role: 'user',
    metadata: { timestamp: '2024-01-01T00:00:00Z', userId: 'user123' },
    parts: [
      { type: 'text', text: 'Show me a chart' },
      {
        type: 'data-chart',
        data: { data: [1, 2, 3], labels: ['A', 'B', 'C'] },
      },
    ],
  },
  {
    id: '2',
    role: 'assistant',
    parts: [
      {
        type: 'tool-weather',
        toolCallId: 'call_123',
        state: 'output-available',
        input: { location: 'San Francisco' },
        output: 'Weather in San Francisco: sunny',
      },
    ],
  },
];

// Validate with all schemas
const result = await safeValidateUIMessages({
  messages,
  metadataSchema,
  dataSchemas,
  tools,
});

if (!result.success) {
  console.error(result.error.message);
} else {
  const validatedMessages = result.data;
}
```

--------------------------------

### Handle Granular Tool UI Part States (AI SDK 4.0 vs 5.0)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

Explains the transition from older, simpler tool invocation states in AI SDK 4.0 to new, more granular states in AI SDK 5.0. The new states (`input-streaming`, `input-available`, `output-available`, `output-error`) provide better representation of the streaming lifecycle and error handling for tool UI parts.

```tsx
// Old states
{
  message.parts.map(part => {
    if (part.type === 'tool-invocation') {
      switch (part.toolInvocation.state) {
        case 'partial-call':
          return <div>Loading...</div>;
        case 'call':
          return (
            <div>
              Tool called with {JSON.stringify(part.toolInvocation.args)}
            </div>
          );
        case 'result':
          return <div>Result: {part.toolInvocation.result}</div>;
      }
    }
  });
}
```

```tsx
// New granular states
{
  message.parts.map(part => {
    switch (part.type) {
      case 'tool-getWeatherInformation':
        switch (part.state) {
          case 'input-streaming':
            return <pre>{JSON.stringify(part.input, null, 2)}</pre>;
          case 'input-available':
            return <div>Getting weather for {part.input.city}...</div>;
          case 'output-available':
            return <div>Weather: {part.output}</div>;
          case 'output-error':
            return <div>Error: {part.errorText}</div>;
        }
    }
  });
}
```

--------------------------------

### Load Chat and Convert Messages (TypeScript)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0-data

Demonstrates how to load chat messages from a database and immediately convert them from V4 to V5 format upon reading. This ensures that the application consistently works with the V5 message structure.

```typescript
import { convertV4MessageToV5, type MyUIMessage } from './conversion';

export async function loadChat(chatId: string): Promise<MyUIMessage[]> {
  // Fetch messages from your database (pseudocode - update based on your data access layer)
  const rawMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt);

  // Convert on read
  return rawMessages.map((msg, index) => convertV4MessageToV5(msg, index));
}
```

--------------------------------

### Generate unstructured JSON output using Output.json() in TypeScript

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-structured-data

This example demonstrates how to use `Output.json()` with the `generateText` function to obtain arbitrary JSON output from a model. It allows for flexible data structures without enforcing a predefined schema, making it suitable for dynamic or unpredictable model responses where only valid JSON syntax is required.

```ts
const { output } = await generateText({
  // ...
  output: Output.json(),
  prompt:
    'For each city, return the current temperature and weather condition as a JSON object.',
});

// output could be any valid JSON, for example:
// {
//   "San Francisco": { "temperature": 70, "condition": "Sunny" },
//   "Paris": { "temperature": 65, "condition": "Cloudy" }
// }
```

--------------------------------

### Generate text with a simple text prompt (AI SDK)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

Demonstrates how to use a basic string as a text prompt with the `generateText` function in the AI SDK. This method is ideal for straightforward generation tasks where the prompt content is static or requires minimal dynamic input.

```javascript
const result = await generateText({
  model: 'openai/gpt-4.1',
  prompt: 'Invent a new holiday and describe its traditions.',
});
```

--------------------------------

### Generate Images with DALL-E 3 using TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/generate-image

This code snippet demonstrates how to use the `generateImage` function from the AI SDK to generate multiple images using the DALL-E 3 model. It takes a prompt, specifies the number of images and their size, and logs the resulting image URLs. Note that `generateImage` is an experimental feature.

```typescript
import { experimental_generateImage as generateImage } from 'ai';

const { images } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'A futuristic cityscape at sunset',
  n: 3,
  size: '1024x1024',
});

console.log(images);
```

--------------------------------

### Update Vue.js Frontend to Display AI SDK Tool Parts

Source: https://v6.ai-sdk.dev/docs/getting-started/nuxt

This Vue.js component snippet updates the chat UI to display different part types from `@ai-sdk/vue` messages. It specifically adds logic within the template to render 'tool-convertFahrenheitToCelsius' and 'tool-weather' parts as formatted JSON, ensuring that tool calls and their results are visible in the chat interface for improved interaction clarity. It uses `ref` for input management and `Chat` from `@ai-sdk/vue` for chat state and message handling.

```vue
<script setup lang="ts">
import { Chat } from "@ai-sdk/vue";
import { ref } from "vue";

const input = ref("");
const chat = new Chat({});

const handleSubmit = (e: Event) => {
    e.preventDefault();
    chat.sendMessage({ text: input.value });
    input.value = "";
};
</script>

<template>
    <div>
        <div v-for="(m, index) in chat.messages" :key="m.id ? m.id : index">
            {{ m.role === "user" ? "User: " : "AI: " }}
            <div
                v-for="(part, index) in m.parts"
                :key="`${m.id}-${part.type}-${index}`"
            >
                <div v-if="part.type === 'text'">{{ part.text }}</div>
                <pre
                    v-if="
                        part.type === 'tool-weather' ||
                        part.type === 'tool-convertFahrenheitToCelsius'
                    "
                    >{{ JSON.stringify(part, null, 2) }}</pre
                >
            </div>
        </div>

        <form @submit="handleSubmit">
            <input v-model="input" placeholder="Say something..." />
        </form>
    </div>
</template>
```

--------------------------------

### Render Components with Tool Invocations using useChat Hook (React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui

This example shows how to use the `useChat` hook from '@ai-sdk/react' to manage chat messages and render components based on tool invocations. It maps through messages, checks for tool invocations, and conditionally renders a 'Weather' component when the tool state is 'result' and the tool name is 'displayWeather'. Handles loading states for tool executions.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { Weather } from '@/components/weather';

export default function Page() {
  const { messages, input, setInput, handleSubmit } = useChat();

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          <div>{message.role}</div>
          <div>{message.content}</div>

          <div>
            {message.toolInvocations.map(toolInvocation => {
              const { toolName, toolCallId, state } = toolInvocation;

              if (state === 'result') {
                const { result } = toolInvocation;

                return (
                  <div key={toolCallId}>
                    {toolName === 'displayWeather' ? (
                      <Weather weatherAtLocation={result} />
                    ) : null}
                  </div>
                );
              } else {
                return (
                  <div key={toolCallId}>
                    {toolName === 'displayWeather' ? (
                      <div>Loading weather...</div>
                    ) : null}
                  </div>
                );
              }
            })}
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={event => {
            setInput(event.target.value);
          }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

```

--------------------------------

### Migrate Svelte Chat input management from internal to manual

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This demonstrates the shift in input management for `@ai-sdk/svelte`. V1 provided `input` and `handleSubmit` directly. V2 requires manual state management for `input` and calling `sendMessage` with the input value instead of relying on an internal `handleSubmit`.

```javascript
// Input was managed internally
const { messages, input, handleSubmit } = chatInstance;
```

```javascript
// Must manage input state manually
let input = '';
const { messages, sendMessage } = chatInstance;

const handleSubmit = () => {
  sendMessage({ text: input });
  input = '';
};
```

--------------------------------

### Add Fahrenheit to Celsius Conversion Tool to AI SDK API Route (TypeScript/Next.js)

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

This code snippet illustrates how to extend the `app/api/chat+api.ts` file by adding a new tool, `convertFahrenheitToCelsius`, to the `tools` object within the `streamText` function. This tool is designed to convert a given temperature from Fahrenheit to Celsius, demonstrating how to integrate multiple tools to enable sequential processing and more sophisticated problem-solving by the AI model.

```tsx
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'openai/gpt-5.1',
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
      convertFahrenheitToCelsius: tool({
        description: 'Convert a temperature in fahrenheit to celsius',
        inputSchema: z.object({
          temperature: z
            .number()
            .describe('The temperature in fahrenheit to convert'),
        }),
        execute: async ({ temperature }) => {
          const celsius = Math.round((temperature - 32) * (5 / 9));
          return {
            celsius,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}
```

--------------------------------

### Stabilize prepareStep Option in generateText (AI SDK)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

The `prepareStep` option, used for configuring individual steps in a multi-step generation process, has been promoted from experimental status in AI SDK 5.0. It no longer requires the `experimental_` prefix and offers enhanced flexibility for dynamic step configuration.

```tsx
const result = await generateText({
  model: openai('gpt-4'),
  messages,
  tools: { weatherTool, locationTool },
  experimental_prepareStep: ({ steps, stepNumber, model }) => {
    console.log('Preparing step:', stepNumber);
    return {
      activeTools: ['weatherTool'],
      system: 'Be helpful and concise.',
    };
  },
});
```

```tsx
const result = await generateText({
  model: openai('gpt-4'),
  messages,
  tools: { weatherTool, locationTool },
  prepareStep: ({ steps, stepNumber, model }) => {
    console.log('Preparing step:', stepNumber);
    return {
      activeTools: ['weatherTool'],
      system: 'Be helpful and concise.',
      // Can also configure toolChoice, model, etc.
    };
  },
});
```

--------------------------------

### Migrate UIMessage Reasoning Property to Parts Array in AI SDK

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This example demonstrates how the `reasoning` property on `UIMessage`s has been moved into the `parts` array in AI SDK 5.0. Instead of a top-level property, reasoning now appears as a part with `type: 'reasoning'`. Update message construction to embed reasoning within the parts array.

```tsx
const message: Message = {
  role: 'assistant',
  content: 'Hello',
  reasoning: 'I will greet the user',
};
```

```tsx
const message: UIMessage = {
  role: 'assistant',
  parts: [
    {
      type: 'reasoning',
      text: 'I will greet the user',
    },
    {
      type: 'text',
      text: 'Hello',
    },
  ],
};
```

--------------------------------

### Generate Objects Without a Schema Using `no-schema` (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-structured-data

This example illustrates how to use `generateObject` when a specific Zod schema is not required, such as for dynamic user requests. By setting `output: 'no-schema'`, you can omit the `schema` parameter, allowing the model to generate a free-form object based solely on the provided prompt. This is useful for flexible data generation scenarios.

```typescript
import { generateObject } from 'ai';

const { object } = await generateObject({
  model: 'openai/gpt-4.1',
  output: 'no-schema',
  prompt: 'Generate a lasagna recipe.',
});
```

--------------------------------

### Enable Multi-Step Tool Calls with `stopWhen` in AI SDK

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

This TypeScript example illustrates how to use the `stopWhen` setting with `generateText` to enable multi-step interactions. By setting a stopping condition (e.g., `stepCountIs(5)`), the AI SDK allows the model to make subsequent tool calls or text generations after an initial tool call, processing results iteratively until the condition is met or no further tools are called.

```ts
import { z } from 'zod';
import { generateText, tool, stepCountIs } from 'ai';

const { text, steps } = await generateText({
  model: 'openai/gpt-5-mini',
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
  stopWhen: stepCountIs(5), // stop after a maximum of 5 steps if tools were called
  prompt: 'What is the weather in San Francisco?',
});
```

--------------------------------

### extractReasoningMiddleware Usage

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/extract-reasoning-middleware

Demonstrates how to import and configure the extractReasoningMiddleware function with custom tag names and separators.

```APIDOC
## `extractReasoningMiddleware()`

### Description
The `extractReasoningMiddleware` function is a middleware designed to process AI model outputs. It identifies and extracts content enclosed within specified XML tags, treating it as 'reasoning'. This extracted reasoning is then separated from the main text content. The middleware handles both streaming and non-streaming responses, ensuring that the `reasoning` is available as a distinct property in the output, while the original XML tags and the reasoning content are removed from the primary text.

### Method
`extractReasoningMiddleware(options: { tagName: string, separator?: string, startWithReasoning?: boolean }) => Middleware`

### Parameters
#### Request Body
- **tagName** (string) - Required - The name of the XML tag to extract reasoning from (without angle brackets).
- **separator** (string) - Optional - The separator to use between reasoning and text sections. Defaults to '\n'.
- **startWithReasoning** (boolean) - Optional - Starts with reasoning tokens. Set to true when the response always starts with reasoning and the initial tag is omitted. Defaults to false.

### Request Example
```ts
import { extractReasoningMiddleware } from 'ai';

const middleware = extractReasoningMiddleware({
  tagName: 'reasoning',
  separator: '\n',
  startWithReasoning: false
});
```

### Response
#### Success Response (200)
The middleware adds a `reasoning` property to the result object. This property contains the extracted content from the specified XML tags.

#### Response Example
```json
{
  "text": "The final output of the AI model.",
  "reasoning": "The detailed reasoning process of the AI model."
}
```
```

--------------------------------

### Configure `generateObject` for Enum Output (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-structured-data

This snippet demonstrates how to restrict the `generateObject` output to a specific set of predefined enum values. By setting `output: 'enum'` and providing an array to the `enum` parameter, you can guide the AI model to classify or categorize inputs into a controlled list. This feature is exclusively available when using `generateObject`.

```typescript
import { generateObject } from 'ai';

const { object } = await generateObject({
  model: 'openai/gpt-4.1',
  output: 'enum',
  enum: ['action', 'comedy', 'drama', 'horror', 'sci-fi'],
  prompt:
    'Classify the genre of this movie plot: ' +
    '"A group of astronauts travel through a wormhole in search of a ' +
    'new habitable planet for humanity."',
});
```

--------------------------------

### Handle Validation Errors in API Routes (TypeScript/React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence

This snippet demonstrates how to catch and handle TypeValidationError when loading messages from a database. It ensures that even if database messages do not match the current schema, the application can gracefully recover, typically by starting with an empty message history. It logs the error for monitoring purposes.

```tsx
import {
  convertToModelMessages,
  streamText,
  validateUIMessages,
  TypeValidationError,
} from 'ai';
import { type MyUIMessage } from '@/types';

export async function POST(req: Request) {
  const { message, id } = await req.json();

  // Load and validate messages from database
  let validatedMessages: MyUIMessage[];

  try {
    const previousMessages = await loadMessagesFromDB(id);
    validatedMessages = await validateUIMessages({
      // append the new message to the previous messages:
      messages: [...previousMessages, message],
      tools,
      metadataSchema,
    });
  } catch (error) {
    if (error instanceof TypeValidationError) {
      // Log validation error for monitoring
      console.error('Database messages validation failed:', error);
      // Could implement message migration or filtering here
      // For now, start with empty history
      validatedMessages = [];
    } else {
      throw error;
    }
  }

  // Continue with validated messages...
}
```

--------------------------------

### Send Multi-modal Tool Results to AI Models (JavaScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

This JavaScript example demonstrates how to send multi-part and multi-modal tool results to an AI model using the AI SDK's `generateText` function. It showcases structuring `tool-result` content with both a JSON `output` and an `experimental_content` array containing text and a base64-encoded image, suitable for models like Anthropic that support advanced multi-modal inputs. The `toolCallId` and `toolName` properties link the result back to a previous tool call.

```javascript
const result = await generateText({
  model: 'openai/gpt-4.1',
  messages: [
    // ...
    {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: '12345', // needs to match the tool call id
          toolName: 'get-nutrition-data',
          // for models that do not support multi-part tool results,
          // you can include a regular output part:
          output: {
            type: 'json',
            value: {
              name: 'Cheese, roquefort',
              calories: 369,
              fat: 31,
              protein: 22,
            },
          },
        },
        {
          type: 'tool-result',
          toolCallId: '12345', // needs to match the tool call id
          toolName: 'get-nutrition-data',
          // for models that support multi-part tool results,
          // you can include a multi-part content part:
          output: {
            type: 'content',
            value: [
              {
                type: 'text',
                text: 'Here is an image of the nutrition data for the cheese:',
              },
              {
                type: 'media',
                data: fs
                  .readFileSync('./data/roquefort-nutrition-data.png')
                  .toString('base64'),
                mediaType: 'image/png',
              },
            ],
          },
        },
      ],
    },
  ],
});
```

--------------------------------

### Upgrade AI SDK and Zod Packages with npm

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This command demonstrates how to update necessary AI SDK packages (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`) and the `zod` peer dependency to their AI SDK 5.0 compatible versions using npm. Ensure `zod` is at least `4.1.8` to avoid potential TypeScript performance issues.

```sh
npm install ai @ai-sdk/react @ai-sdk/openai zod@^4.1.8
```

--------------------------------

### Replace StreamData with createUIMessageStream for Custom Data in AI SDK

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This example shows the deprecation and removal of the `StreamData` class in AI SDK 5.0. Custom data streaming is now handled by `createUIMessageStream`, which allows writing custom data parts and merging with LLM streams. Update custom data streaming implementations to use the new UIMessage stream approach.

```tsx
import { StreamData } from 'ai';

const streamData = new StreamData();
streamData.append('custom-data');
streamData.close();
```

```tsx
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';

const stream = createUIMessageStream({
  execute({ writer }) {
    // Write custom data parts
    writer.write({
      type: 'data-custom',
      id: 'custom-1',
      data: 'custom-data',
    });

    // Can merge with LLM streams
    const result = streamText({
      model: openai('gpt-4.1'),
      messages,
    });

    writer.merge(result.toUIMessageStream());
  },
});

return createUIMessageStreamResponse({ stream });
```

--------------------------------

### Update UIMessage Content to Parts Array in AI SDK

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This example shows the evolution of `UIMessage` structure. In AI SDK 4.0, messages had a direct `content` property. In AI SDK 5.0, this is replaced by a `parts` array, allowing for structured content types like text. Adjust message object definitions for `useChat` hooks.

```tsx
import { type Message } from 'ai'; // v4 Message type

// Messages (useChat) - had content property
const message: Message = {
  id: '1',
  role: 'user',
  content: 'Bonjour!',
};
```

```tsx
import { type UIMessage, type ModelMessage } from 'ai';

// UIMessages (useChat) - now use parts array
const uiMessage: UIMessage = {
  id: '1',
  role: 'user',
  parts: [{ type: 'text', text: 'Bonjour!' }],
};
```

--------------------------------

### Implement Custom Agent Loop with AI SDK Core (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/loop-control

Provides an example of building a fully manual agent loop using `generateText` from AI SDK Core, instead of relying on `ToolLoopAgent`'s automated flow. This approach offers maximum flexibility for complex scenarios, allowing complete control over message history, step decisions, dynamic tool/model selection, and custom stopping conditions.

```ts
import { generateText, ModelMessage } from 'ai';

const messages: ModelMessage[] = [{ role: 'user', content: '...' }];

let step = 0;
const maxSteps = 10;

while (step < maxSteps) {
  const result = await generateText({
    model: 'openai/gpt-5-mini',
    messages,
    tools: {
      // your tools here
    },
  });

  messages.push(...result.response.messages);

  if (result.text) {
    break; // Stop when model generates text
  }

  step++;
}
```

--------------------------------

### Close Streamable UI with .done() - TypeScript/TSX

Source: https://v6.ai-sdk.dev/docs/troubleshooting/unclosed-streams

This code snippet demonstrates how to correctly close a streamable UI created using `createStreamableUI` by calling the `.done()` method. Failing to close the stream can lead to issues like slow UI updates. This example uses TypeScript (TSX) and assumes a server-side rendering context.

```tsx
import { createStreamableUI } from '@ai-sdk/rsc';

const submitMessage = async () => {
  'use server';

  const stream = createStreamableUI('1');

  stream.update('2');
  stream.append('3');
  stream.done('4'); // [!code ++]

  return stream.value;
};
```

--------------------------------

### Implement client-side chat with type-safe AI Agent UI (TypeScript)

Source: https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta

This TypeScript example illustrates how to integrate the AI SDK's `useChat` hook within a React component for client-side chat functionality. It utilizes `InferAgentUIMessage` to ensure strong type safety based on a specific agent's definition (e.g., `weatherAgent`), providing a robust and error-resistant frontend experience.

```typescript
// Client-side with type safety
import { useChat } from '@ai-sdk/react';
import { InferAgentUIMessage } from 'ai';
import { weatherAgent } from '@/agent/weather-agent';

type WeatherAgentUIMessage = InferAgentUIMessage<typeof weatherAgent>;

const { messages, sendMessage } = useChat<WeatherAgentUIMessage>();
```

--------------------------------

### Convert Custom UI Data Parts for AI Models (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages

This example demonstrates how to use the `convertDataPart` option within `convertToModelMessages` to transform custom UI data parts (e.g., URLs, code files) into text or file parts that an AI model can understand. This enables AI models to leverage additional context attached to user messages.

```typescript
import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, streamText } from 'ai';

type CustomUIMessage = UIMessage<
  never,
  {
    url: { url: string; title: string; content: string };
    'code-file': { filename: string; code: string; language: string };
  }
>;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-5-mini'),
    messages: convertToModelMessages<CustomUIMessage>(messages, {
      convertDataPart: part => {
        // Convert URL attachments to text
        if (part.type === 'data-url') {
          return {
            type: 'text',
            text: `[Reference: ${part.data.title}](${part.data.url})\n\n${part.data.content}`,
          };
        }

        // Convert code file attachments
        if (part.type === 'data-code-file') {
          return {
            type: 'text',
            text: `\`\`\`${part.data.language}\n// ${part.data.filename}\n${part.data.code}\n\`\`\``,
          };
        }

        // Other data parts are ignored
      },
    }),
  });

  return result.toUIMessageStreamResponse();
}
```

--------------------------------

### Handle Mixed Static and Dynamic Tools with Type Narrowing (AI SDK 5.0)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

Demonstrates how to use the `dynamic` flag to correctly narrow types when interacting with both static and dynamic tools within the `onStepFinish` callback. Static tool inputs are fully typed, while dynamic tool inputs are correctly identified as `unknown`.

```tsx
const result = await generateText({
  model: openai('gpt-4'),
  tools: {
    // Static tool with known types
    weather: weatherTool,
    // Dynamic tool with unknown types
    customDynamicTool: dynamicTool({
      /* ... */
    }),
  },
  onStepFinish: step => {
    // Handle tool calls with type safety
    for (const toolCall of step.toolCalls) {
      if (toolCall.dynamic) {
        // Dynamic tool: input/output are 'unknown'
        console.log('Dynamic tool called:', toolCall.toolName);
        continue;
      }

      // Static tools have full type inference
      switch (toolCall.toolName) {
        case 'weather':
          // TypeScript knows the exact types
          console.log(toolCall.input.location); // string
          break;
      }
    }
  },
});
```

--------------------------------

### Import InferUITools Type Helper

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/infer-ui-tools

Imports the `InferUITools` type helper from the 'ai' package. This is the primary utility for inferring tool types.

```typescript
import { InferUITools } from 'ai';
```

--------------------------------

### Infer Input/Output Types from ToolSet

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/infer-ui-tools

Demonstrates inferring input and output types for a `ToolSet` containing 'weather' and 'calculator' tools. It utilizes Zod for schema definition and `InferUITools` to generate a type that maps each tool to its specific input and output structure.

```typescript
import { InferUITools } from 'ai';
import { z } from 'zod';

const tools = {
  weather: {
    description: 'Get the current weather',
    parameters: z.object({
      location: z.string().describe('The city and state'),
    }),
    execute: async ({ location }) => {
      return `The weather in ${location} is sunny.`;
    },
  },
  calculator: {
    description: 'Perform basic arithmetic',
    parameters: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number(),
    }),
    execute: async ({ operation, a, b }) => {
      switch (operation) {
        case 'add':
          return a + b;
        case 'subtract':
          return a - b;
        case 'multiply':
          return a * b;
        case 'divide':
          return a / b;
      }
    },
  },
};

// Infer the types from the tool set
type MyUITools = InferUITools<typeof tools>;
// This creates a type with:
// {
//   weather: { input: { location: string }; output: string };
//   calculator: { input: { operation: 'add' | 'subtract' | 'multiply' | 'divide'; a: number; b: number }; output: number };
// }
```

--------------------------------

### List MCP Prompts (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

This snippet demonstrates how to retrieve a list of all available prompts from the MCP server. Prompts are user-controlled templates exposed by servers.

```typescript
const prompts = await mcpClient.listPrompts();
```

--------------------------------

### Custom Provider Registry Configuration with AI SDK

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/provider-management

Demonstrates advanced configuration of a provider registry using the AI SDK. This includes setting up custom providers, aliasing model names, pre-configuring model settings, and defining custom separators. It requires importing various modules from '@ai-sdk/*' and 'ai'.

```typescript
import { anthropic, AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { xai } from '@ai-sdk/xai';
import { groq } from '@ai-sdk/groq';
import {
  createProviderRegistry,
  customProvider,
  defaultSettingsMiddleware,
  wrapLanguageModel,
} from 'ai';

export const registry = createProviderRegistry(
  {
    // pass through a full provider with a namespace prefix
    xai,

    // access an OpenAI-compatible provider with custom setup
    custom: createOpenAICompatible({
      name: 'provider-name',
      apiKey: process.env.CUSTOM_API_KEY,
      baseURL: 'https://api.custom.com/v1',
    }),

    // setup model name aliases
    anthropic: customProvider({
      languageModels: {
        fast: anthropic('claude-3-haiku-20240307'),

        // simple model
        writing: anthropic('claude-3-7-sonnet-20250219'),

        // extended reasoning model configuration:
        reasoning: wrapLanguageModel({
          model: anthropic('claude-3-7-sonnet-20250219'),
          middleware: defaultSettingsMiddleware({
            settings: {
              maxOutputTokens: 100000, // example default setting
              providerOptions: {
                anthropic: {
                  thinking: {
                    type: 'enabled',
                    budgetTokens: 32000,
                  },
                } satisfies AnthropicProviderOptions,
              },
            },
          }),
        }),
      },
      fallbackProvider: anthropic,
    }),

    // limit a provider to certain models without a fallback
    groq: customProvider({
      languageModels: {
        'gemma2-9b-it': groq('gemma2-9b-it'),
        'qwen-qwq-32b': groq('qwen-qwq-32b'),
      },
    }),
  },
  { separator: ' > ' },
);

// usage:
const model = registry.languageModel('anthropic > reasoning');

```

--------------------------------

### Build a React UI component for AI SDK tool approval (TSX)

Source: https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta

This TSX (React) component demonstrates how to render a dynamic user interface for handling AI SDK tool approval requests. It intelligently checks the `invocation.state` to display either an approval prompt or the tool's output, and uses `addToolApprovalResponse` to communicate user decisions (approve/deny) back to the AI SDK, creating an interactive approval workflow.

```tsx
export function WeatherToolView({ invocation, addToolApprovalResponse }) {
  if (invocation.state === 'approval-requested') {
    return (
      <div>
        <p>Can I retrieve the weather for {invocation.input.city}?</p>
        <button
          onClick={() =>
            addToolApprovalResponse({
              id: invocation.approval.id,
              approved: true,
            })
          }
        >
          Approve
        </button>
        <button
          onClick={() =>
            addToolApprovalResponse({
              id: invocation.approval.id,
              approved: false,
            })
          }
        >
          Deny
        </button>
      </div>
    );
  }

  if (invocation.state === 'output-available') {
    return (
      <div>
        Weather: {invocation.output.weather}
        Temperature: {invocation.output.temperature}°F
      </div>
    );
  }

  // Handle other states...
}
```

--------------------------------

### Modify Chat Messages with setMessages (React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot

Shows how to directly manipulate the chat messages array using the 'setMessages' function provided by the 'useChat' hook. This example implements a 'Delete' button for each message, which filters out the message with the matching ID from the messages array. The 'messages' and 'setMessages' pair functions similarly to React's 'useState'.

```tsx
const { messages, setMessages } = useChat()

const handleDelete = (id) => {
  setMessages(messages.filter(message => message.id !== id))
}

return <>
  {messages.map(message => (
    <div key={message.id}>
      {message.role === 'user' ? 'User: ' : 'AI: '}
      {message.parts.map((part, index) => (
        part.type === 'text' ? (
          <span key={index}>{part.text}</span>
        ) : null
      ))}
      <button onClick={() => handleDelete(message.id)}>Delete</button>
    </div>
  ))}
  ...
```
```

--------------------------------

### Create Streaming Chat API Route Handler in Expo with AI SDK

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

API route handler that processes POST requests for chat functionality using the AI SDK's streamText function. It accepts a messages array containing conversation history, converts them to model messages, streams the AI response using OpenAI GPT-5.1, and returns a UI message stream response with custom headers for proper streaming in Expo applications.

```typescript
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'openai/gpt-5.1',
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}
```

--------------------------------

### Generate arrays with Output.array (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-structured-data

Use Output.array to expect an array of typed elements from the model; provide an element schema and the SDK extracts and validates the array. Dependencies: Output.array and a Zod element schema; input is a prompt and output is an array of validated objects. Limitation: the model is guided to return an object with an elements property, which the SDK extracts.

```TypeScript
const { output } = await generateText({
  // ...
  output: Output.array({
    element: z.object({
      location: z.string(),
      temperature: z.number(),
      condition: z.string(),
    }),
  }),
  prompt: 'List the weather for San Francisco and Paris.',
});
// output will be an array of objects like:
// [
//   { location: 'San Francisco', temperature: 70, condition: 'Sunny' },
//   { location: 'Paris', temperature: 65, condition: 'Cloudy' },
// ]
```

--------------------------------

### Handle UI Message Stream Abortion with AI SDK

Source: https://v6.ai-sdk.dev/docs/advanced/stopping-streams

This snippet demonstrates how to correctly handle stream abortion when using `toUIMessageStreamResponse` from the AI SDK. It requires passing the `consumeStream` function to ensure proper abort handling and includes examples of conditional logic based on the `isAborted` parameter in the `onFinish` callback. The `abortSignal` from the request is used to initiate the abortion.

```tsx
import {
  openai
} from '@ai-sdk/openai';
import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-5-mini'),
    messages: convertToModelMessages(messages),
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ isAborted }) => {
      if (isAborted) {
        console.log('Stream was aborted');
        // Handle abort-specific cleanup
      } else {
        console.log('Stream completed normally');
        // Handle normal completion
      }
    },
    consumeSseStream: consumeStream,
  });
}
```

--------------------------------

### experimental_createMCPClient() - Create MCP Client

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

Creates a lightweight Model Context Protocol (MCP) client that connects to an MCP server. The client provides automatic conversion between MCP tools and AI SDK tools, methods to manage resources, and methods to work with prompts. This is an experimental feature and currently does not support accepting notifications from MCP servers or custom client configuration.

```APIDOC
## experimental_createMCPClient()

### Description
Creates a lightweight Model Context Protocol (MCP) client that connects to an MCP server. The client provides:
- **Tools**: Automatic conversion between MCP tools and AI SDK tools
- **Resources**: Methods to list, read, and discover resource templates from MCP servers
- **Prompts**: Methods to list available prompts and retrieve prompt messages

This feature is experimental and may change or be removed in the future. It currently does not support accepting notifications from an MCP server, and custom configuration of the client.

### Import
```javascript
import { experimental_createMCPClient } from "@ai-sdk/mcp"
```

### Method
Function

### Parameters

#### config (MCPClientConfig) - Required
Configuration object for the MCP client.

##### transport (TransportConfig) - Required
Configuration for the message transport layer. Can be either MCPTransport or McpSSEServerConfig.

**MCPTransport** - A client transport instance, used explicitly for stdio or custom transports
- **start** (function) - Required - A method that starts the transport
  - Type: `() => Promise<void>`
- **send** (function) - Required - A method that sends a message through the transport
  - Type: `(message: JSONRPCMessage) => Promise<void>`
- **close** (function) - Required - A method that closes the transport
  - Type: `() => Promise<void>`
- **onclose** (function) - Required - A method that is called when the transport is closed
  - Type: `() => void`
- **onerror** (function) - Required - A method that is called when the transport encounters an error
  - Type: `(error: Error) => void`
- **onmessage** (function) - Required - A method that is called when the transport receives a message
  - Type: `(message: JSONRPCMessage) => void`

**MCPTransportConfig** - Configuration for SSE or HTTP transport
- **type** (string) - Required - Transport type. Values: 'sse' | 'http'
- **url** (string) - Required - URL of the MCP server
- **headers** (Record<string, string>) - Optional - Additional HTTP headers to be sent with requests
- **authProvider** (OAuthClientProvider) - Optional - Optional OAuth provider for authorization to access protected remote MCP servers

##### name (string) - Optional
Client name. Defaults to "ai-sdk-mcp-client"

##### onUncaughtError (function) - Optional
Handler for uncaught errors
- Type: `(error: unknown) => void`

### Usage Example
```javascript
import { experimental_createMCPClient } from "@ai-sdk/mcp";

// Example with SSE transport
const client = experimental_createMCPClient({
  transport: {
    type: 'sse',
    url: 'https://example.com/mcp',
    headers: {
      'Authorization': 'Bearer token123'
    }
  },
  name: 'my-mcp-client',
  onUncaughtError: (error) => {
    console.error('MCP Client Error:', error);
  }
});

// Example with custom transport
const customClient = experimental_createMCPClient({
  transport: {
    start: async () => { /* start logic */ },
    send: async (message) => { /* send logic */ },
    close: async () => { /* close logic */ },
    onclose: () => { /* cleanup */ },
    onerror: (error) => { /* error handling */ },
    onmessage: (message) => { /* message handling */ }
  }
});
```

### Return Value
Returns an MCP client instance with methods for:
- Managing tools (automatic conversion between MCP and AI SDK tools)
- Listing and reading resources
- Discovering resource templates
- Listing and retrieving prompts

### Notes
- This is an experimental feature and the API may change or be removed in future versions
- Currently does not support accepting notifications from MCP servers
- Custom configuration of the client is not yet supported
- The client provides automatic tool conversion between MCP and AI SDK formats
```

--------------------------------

### Run AI SDK v5 Specific Migration Codemods

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This command specifically executes codemods designed for the AI SDK v4 to v5 migration process. It targets changes relevant to the 5.0 upgrade, providing a focused automated transformation.

```sh
npx @ai-sdk/codemod v5
```

--------------------------------

### Import createUIMessageStreamResponse

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/create-ui-message-stream-response

Imports the createUIMessageStreamResponse function from the 'ai' library. This is a necessary first step before using the function.

```typescript
import { createUIMessageStreamResponse } from "ai";
```

--------------------------------

### Implement Weather Tool in Nuxt API Route with AI SDK and Zod Validation

Source: https://v6.ai-sdk.dev/docs/getting-started/nuxt

Configures a Nuxt server API route to include a weather tool using AI SDK's streamText and tool functions. The weather tool uses Zod schema validation to extract location from conversation context and executes an async function to return simulated temperature data. The model automatically invokes this tool when weather information is requested.

```typescript
import {
  createGateway,
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
} from 'ai';
import { z } from 'zod';

export default defineLazyEventHandler(async () => {
  const apiKey = useRuntimeConfig().aiGatewayApiKey;
  if (!apiKey) throw new Error('Missing AI Gateway API key');
  const gateway = createGateway({
    apiKey: apiKey,
  });

  return defineEventHandler(async (event: any) => {
    const { messages }: { messages: UIMessage[] } = await readBody(event);

    const result = streamText({
      model: gateway('openai/gpt-5.1'),
      messages: convertToModelMessages(messages),
      tools: {
        weather: tool({
          description: 'Get the weather in a location (fahrenheit)',
          inputSchema: z.object({
            location: z
              .string()
              .describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => {
            const temperature = Math.round(Math.random() * (90 - 32) + 32);
            return {
              location,
              temperature,
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  });
});
```

--------------------------------

### Declare generation step options with experimental downloads - TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/generate-text

TypeScript interface that defines optional generation-step-level settings including experimental context and a customizable download handler. Depends on standard types like URL and Uint8Array and returns Promise-wrapped results. Experimental features can change in patch releases and may return null to pass URLs directly to the model.

```TypeScript
interface GenerationStepOptions<TOOLS = any> {
  experimental_context?: unknown;
  experimental_download?: (
    requestedDownloads: Array<{ url: URL; isUrlSupportedByModel: boolean }>
  ) => Promise<Array<null | { data: Uint8Array; mediaType?: string }>>;
  experimental_repairToolCall?: (
    options: ToolCallRepairOptions
  ) => Promise<LanguageModelV3ToolCall | null>;
  output?: Output;
}
```

--------------------------------

### Run Drizzle ORM Database Migration

Source: https://v6.ai-sdk.dev/docs/guides/rag-chatbot

Execute this command to apply the initial Drizzle ORM migration to your PostgreSQL database. This migration adds the `pgvector` extension and creates the `resources` table with `id`, `content`, `createdAt`, and `updatedAt` columns.

```bash
pnpm db:migrate
```

--------------------------------

### Manage Chat Status with useChat Hook (React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot

Demonstrates how to use the 'status' property returned by the 'useChat' hook to control UI elements like loading indicators and buttons. The status can be 'submitted', 'streaming', 'ready', or 'error'. This example shows how to display a spinner and a 'Stop' button when the status is 'submitted' or 'streaming', and disables the input and submit button when the status is not 'ready'.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function Page() {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  const [input, setInput] = useState('');

  return (
    <>
      {messages.map(message => (
        <div key={message.id}>
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, index) =>
            part.type === 'text' ? <span key={index}>{part.text}</span> : null,
          )}
        </div>
      ))}

      {(status === 'submitted' || status === 'streaming') && (
        <div>
          {status === 'submitted' && <Spinner />}
          <button type="button" onClick={() => stop()}>
            Stop
          </button>
        </div>
      )}

      <form
        onSubmit={e => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
          }
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={status !== 'ready'}
          placeholder="Say something..."
        />
        <button type="submit" disabled={status !== 'ready'}>
          Submit
        </button>
      </form>
    </>
  );
}

```

--------------------------------

### Handle AI SDK Tool Calls Client-Side with `useChat` and `onToolCall`

Source: https://v6.ai-sdk.dev/docs/troubleshooting/tool-invocation-missing-result

This example shows how to manage AI SDK tool calls client-side using `useChat` from `@ai-sdk/react`. The `onToolCall` callback processes the tool invocation, and `addToolOutput` is used to provide the result or an error back to the chat, crucially without awaiting inside `onToolCall` to prevent deadlocks.

```tsx
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';

const { messages, sendMessage, addToolOutput } = useChat({
  // Automatically submit when all tool results are available
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

  // Handle tool calls in onToolCall
  onToolCall: async ({ toolCall }) => {
    if (toolCall.toolName === 'getLocation') {
      try {
        const result = await getLocationData();

        // Important: Don't await inside onToolCall to avoid deadlocks
        addToolOutput({
          tool: 'getLocation',
          toolCallId: toolCall.toolCallId,
          output: result,
        });
      } catch (err) {
        // Important: Don't await inside onToolCall to avoid deadlocks
        addToolOutput({
          tool: 'getLocation',
          toolCallId: toolCall.toolCallId,
          state: 'output-error',
          errorText: 'Failed to get location',
        });
      }
    }
  },
});
```

--------------------------------

### Create Agent with Tools and Stream Response

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-agent-ui-stream-response

Demonstrates how to instantiate a ToolLoopAgent with specific model, instructions, and tools, then use createAgentUIStreamResponse to stream agent output. The function takes an agent instance, messages array, and optional streaming options to return an HTTP Response.

```typescript
import { ToolLoopAgent, createAgentUIStreamResponse } from 'ai';

const agent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  instructions: 'You are a helpful assistant.',
  tools: { weather: weatherTool, calculator: calculatorTool },
});

export async function POST(request: Request) {
  const { messages } = await request.json();

  // Stream agent response as an HTTP Response with UI messages
  return createAgentUIStreamResponse({
    agent,
    messages,
    // ...other optional streaming options
  });
}
```

--------------------------------

### Selectively Convert Data Parts for AI SDK Messages (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages

This example shows the `convertToModelMessages` utility in action, processing `UIMessage` objects with various custom data parts. It demonstrates selective inclusion by converting a 'data-url' part into a simple text link, while intentionally ignoring other custom types like 'data-code' and 'data-note' which will not be passed to the model.

```ts
const result = convertToModelMessages<
  UIMessage<
    unknown,
    {
      url: { url: string; title: string };
      code: { code: string; language: string };
      note: { text: string };
    }
  >
>(messages, {
  convertDataPart: part => {
    if (part.type === 'data-url') {
      return {
        type: 'text',
        text: `[${part.data.title}](${part.data.url})`,
      };
    }

    // data-code and data-node are ignored
  },
});
```

--------------------------------

### Handle `AI_NoObjectGeneratedError` from `generateObject` (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-structured-data

This example illustrates how to implement robust error handling for `generateObject` using a `try-catch` block. It specifically catches `AI_NoObjectGeneratedError`, which is thrown when the AI provider fails to generate a valid object conforming to the schema. The error object provides detailed information such as the `cause`, `text` generated by the model, `response` metadata, and `usage` for debugging purposes.

```typescript
import { generateObject, NoObjectGeneratedError } from 'ai';

try {
  await generateObject({ model, schema, prompt });
} catch (error) {
  if (NoObjectGeneratedError.isInstance(error)) {
    console.log('NoObjectGeneratedError');
    console.log('Cause:', error.cause);
    console.log('Text:', error.text);
    console.log('Response:', error.response);
    console.log('Usage:', error.usage);
  }
}
```

--------------------------------

### Generate Text with Provider Options (Message Level)

Source: https://v6.ai-sdk.dev/docs/foundations/prompts

Demonstrates applying provider-specific options at the message level using `providerOptions` within a message object for granular control.

```TypeScript
import { ModelMessage } from 'ai';

const messages: ModelMessage[] = [
  {
    role: 'system',
    content: 'Cached system message',
    providerOptions: {
      // Sets a cache control breakpoint on the system message
      anthropic: { cacheControl: { type: 'ephemeral' } },
    },
  },
];
```

--------------------------------

### Implement Custom Streaming Loader with `useChat` in React

Source: https://v6.ai-sdk.dev/docs/troubleshooting/streaming-status-delay

This code demonstrates how to create a custom loading state for `useChat` in `@ai-sdk/react`. It checks if the `status` is 'streaming' and if the last assistant message has no content (`parts?.length === 0`), indicating that text has not yet started appearing. This provides a more accurate visual loading indicator for users, differentiating between connection establishment and actual token streaming.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';

export default function Page() {
  const { messages, status } = useChat();

  const lastMessage = messages.at(-1);

  const showLoader =
    status === 'streaming' &&
    lastMessage?.role === 'assistant' &&
    lastMessage?.parts?.length === 0;

  return (
    <>
      {messages.map(message => (
        <div key={message.id}>
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, index) =>
            part.type === 'text' ? <span key={index}>{part.text}</span> : null,
          )}
        </div>
      ))}

      {showLoader && <div>Loading...</div>}
    </>
  );
}
```

--------------------------------

### Create SvelteKit Chat API Endpoint with AI SDK Stream

Source: https://v6.ai-sdk.dev/docs/getting-started/svelte

This SvelteKit `+server.ts` endpoint demonstrates how to create a chat API that leverages the AI SDK. It uses `streamText` to generate a response, converts `UIMessage` types for the model, and integrates with the Vercel AI Gateway for model access.

```tsx
import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  createGateway,
} from 'ai';

import { AI_GATEWAY_API_KEY } from '$env/static/private';

const gateway = createGateway({
  apiKey: AI_GATEWAY_API_KEY,
});

export async function POST({ request }) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: gateway('openai/gpt-5.1'),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

--------------------------------

### Constrain Agent Behavior with Rules and Tools (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/building-agents

This snippet shows how to set explicit boundaries and rules for an agent, ensuring consistent and controlled behavior. It also demonstrates how to assign specific tools that the agent can use, such as `checkOrderStatus`, `lookupPolicy`, and `createTicket`.

```ts
const customerSupportAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  instructions: `You are a customer support specialist for an e-commerce platform.

  Rules:
  - Never make promises about refunds without checking the policy
  - Always be empathetic and professional
  - If you don't know something, say so and offer to escalate
  - Keep responses concise and actionable
  - Never share internal company information`,
  tools: {
    checkOrderStatus,
    lookupPolicy,
    createTicket,
  },
});
```

--------------------------------

### Define Initial Resource Creation Server Action (TypeScript)

Source: https://v6.ai-sdk.dev/docs/guides/rag-chatbot

This server action, located at `lib/actions/resources.ts`, provides a function `createResource` to save new resources to the database. It uses Zod for input validation and returns a success message or an error. The `'use server'` directive allows it to be called from client components within a Next.js application.

```typescript
'use server';


import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from '@/lib/db/schema/resources';
import { db } from '../db';


export const createResource = async (input: NewResourceParams) => {
  try {
    const { content } = insertResourceSchema.parse(input);


    const [resource] = await db
      .insert(resources)
      .values({ content })
      .returning();


    return 'Resource successfully created.';
  } catch (e) {
    if (e instanceof Error)
      return e.message.length > 0 ? e.message : 'Error, please try again.';
  }
};
```

--------------------------------

### Repair Invalid Tool Calls using experimental_repairToolCall with Structured Output Model in TypeScript

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

An example of implementing the experimental `experimental_repairToolCall` function to automatically fix invalid tool calls. This approach leverages `generateObject` with a structured output model (e.g., `gpt-4.1`) to parse and regenerate the tool's input arguments based on its schema, effectively correcting common model errors in tool invocation without polluting message history.

```ts
import { openai } from '@ai-sdk/openai';
import { generateObject, generateText, NoSuchToolError, tool } from 'ai';

const result = await generateText({
  model,
  tools,
  prompt,

  experimental_repairToolCall: async ({
    toolCall,
    tools,
    inputSchema,
    error,
  }) => {
    if (NoSuchToolError.isInstance(error)) {
      return null; // do not attempt to fix invalid tool names
    }

    const tool = tools[toolCall.toolName as keyof typeof tools];

    const { object: repairedArgs } = await generateObject({
      model: openai('gpt-4.1'),
      schema: tool.inputSchema,
      prompt: [
        `The model tried to call the tool "${toolCall.toolName}"` +
          ` with the following inputs:`,
        JSON.stringify(toolCall.input),
        `The tool accepts the following schema:`,
        JSON.stringify(inputSchema(toolCall)),
        'Please fix the inputs.',
      ].join('\n'),
    });

    return { ...toolCall, input: JSON.stringify(repairedArgs) };
  },
});
```

--------------------------------

### List MCP Resources (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

This snippet illustrates how to retrieve a list of all available resources from the MCP server. Resources are application-driven data sources that provide context to the model.

```typescript
const resources = await mcpClient.listResources();
```

--------------------------------

### Update React Native UI to Display AI Tool Invocations

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

This TypeScript React Native component modifies the chat interface to correctly render different types of message parts received from the AI model. It distinguishes between standard 'text' parts and 'tool-weather' parts, displaying text content for the former and a JSON representation for the latter. This allows users to visualize when an AI tool, like a weather tool, is invoked and what data it returns.

```tsx
import { generateAPIUrl } from '@/utils';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { useState } from 'react';
import { View, TextInput, ScrollView, Text, SafeAreaView } from 'react-native';

export default function App() {
  const [input, setInput] = useState('');
  const { messages, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl('/api/chat'),
    }),
    onError: error => console.error(error, 'ERROR'),
  });

  if (error) return <Text>{error.message}</Text>;

  return (
    <SafeAreaView style={{ height: '100%' }}>
      <View
        style={{
          height: '95%',
          display: 'flex',
          flexDirection: 'column',
          paddingHorizontal: 8,
        }}
      >
        <ScrollView style={{ flex: 1 }}>
          {messages.map(m => (
            <View key={m.id} style={{ marginVertical: 8 }}>
              <View>
                <Text style={{ fontWeight: 700 }}>{m.role}</Text>
                {m.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      return <Text key={`${m.id}-${i}`}>{part.text}</Text>;
                    case 'tool-weather':
                      return (
                        <Text key={`${m.id}-${i}`}>
                          {JSON.stringify(part, null, 2)}
                        </Text>
                      );
                  }
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={{ marginTop: 8 }}>
          <TextInput
            style={{ backgroundColor: 'white', padding: 8 }}
            placeholder="Say something..."
            value={input}
            onChange={e => setInput(e.nativeEvent.text)}
            onSubmitEditing={e => {
              e.preventDefault();
              sendMessage({ text: input });
              setInput('');
            }}
            autoFocus={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
```

--------------------------------

### Use Inferred Agent UIMessage Type in React Chat Component (TypeScript React)

Source: https://v6.ai-sdk.dev/docs/agents/building-agents

This `tsx` example demonstrates how to use the inferred `MyAgentUIMessage` type within a React client component, specifically with the `useChat` hook from `@ai-sdk/react`. This ensures full type safety for messages and tools throughout the application's UI, enhancing developer experience and reducing errors.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import type { MyAgentUIMessage } from '@/agent/my-agent';

export function Chat() {
  const { messages } = useChat<MyAgentUIMessage>();
  // Full type safety for your messages and tools
}
```

--------------------------------

### Set Schema Strictness for OpenAI Responses in AI SDK 4 and 5

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This example demonstrates how to configure strict schema validation for OpenAI Responses models across AI SDK versions. AI SDK 4 used `strictSchemas` which defaulted to `true`. AI SDK 5 renames this to `strictJsonSchema`, now defaulting to `false`, requiring explicit opt-in for strict behavior.

```tsx
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai, type OpenAIResponsesProviderOptions } from '@ai-sdk/openai';

const result = await generateObject({
  model: openai.responses('gpt-4.1'),
  schema: z.object({
    // ...
  }),
  providerOptions: {
    openai: {
      strictSchemas: true, // default behaviour in AI SDK 4
    } satisfies OpenAIResponsesProviderOptions,
  },
});
```

```tsx
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai, type OpenAIResponsesProviderOptions } from '@ai-sdk/openai';

const result = await generateObject({
  model: openai('gpt-4.1-2024'), // uses Responses API
  schema: z.object({
    // ...
  }),
  providerOptions: {
    openai: {
      strictJsonSchema: true, // defaults to false, opt back in to the AI SDK 4 strict behaviour
    } satisfies OpenAIResponsesProviderOptions,
  },
});
```

--------------------------------

### Implement Custom Stream Termination with Stop Word (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-text

This TypeScript function creates a `TransformStream` that can stop an AI SDK stream. If a 'text' type chunk contains the word 'STOP', it calls `stopStream()` and then enqueues simulated `finish-step` and `finish` events to ensure a well-formed stream termination. This example is simplified and would require buffering for robust real-world detection.

```typescript
const stopWordTransform =
  <TOOLS extends ToolSet>() =>
  ({ stopStream }: { stopStream: () => void }) =>
    new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      // note: this is a simplified transformation for testing;
      // in a real-world version more there would need to be
      // stream buffering and scanning to correctly emit prior text
      // and to detect all STOP occurrences.
      transform(chunk, controller) {
        if (chunk.type !== 'text') {
          controller.enqueue(chunk);
          return;
        }

        if (chunk.text.includes('STOP')) {
          // stop the stream
          stopStream();

          // simulate the finish-step event
          controller.enqueue({
            type: 'finish-step',
            finishReason: 'stop',
            logprobs: undefined,
            usage: {
              completionTokens: NaN,
              promptTokens: NaN,
              totalTokens: NaN,
            },
            request: {},
            response: {
              id: 'response-id',
              modelId: 'mock-model-id',
              timestamp: new Date(0),
            },
            warnings: [],
            isContinued: false,
          });

          // simulate the finish event
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            logprobs: undefined,
            usage: {
              completionTokens: NaN,
              promptTokens: NaN,
              totalTokens: NaN,
            },
            response: {
              id: 'response-id',
              modelId: 'mock-model-id',
              timestamp: new Date(0),
            },
          });

          return;
        }

        controller.enqueue(chunk);
      },
    });
```

--------------------------------

### Convert and Stream Messages with AI SDK v5

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0-data

This snippet demonstrates how to handle incoming user messages, convert them from v5 to v4 format for database storage, load previous messages, stream a response using an AI model, and convert the assistant's response back to v4 before saving. It uses the AI SDK v5 and involves inline conversion logic within a route handler.

```tsx
import { openai } from '@ai-sdk/openai';
import { 
  convertV5MessageToV4,
  convertV4MessageToV5,
  type MyUIMessage,
} from './conversion';
import { upsertMessage, loadChat } from './db/actions';
import { streamText, generateId, convertToModelMessages } from 'ai';

export async function POST(req: Request) {
  const { message, chatId }: { message: MyUIMessage; chatId: string } = 
    await req.json();

  // Convert and save incoming user message (v5 to v4 inline)
  await upsertMessage({
    chatId,
    id: message.id,
    message: convertV5MessageToV4(message), // convert to v4
  });

  // Load previous messages (already in v5 format)
  const previousMessages = await loadChat(chatId);
  const messages = [...previousMessages, message];

  const result = streamText({
    model: openai('gpt-4'),
    messages: convertToModelMessages(messages),
    tools: {
      // Your tools here
    },
  });

  return result.toUIMessageStreamResponse({
    generateMessageId: generateId,
    originalMessages: messages,
    onFinish: async ({ responseMessage }) => {
      // Convert and save assistant response (v5 to v4 inline)
      await upsertMessage({
        chatId,
        id: responseMessage.id,
        message: convertV5MessageToV4(responseMessage),
      });
    },
  });
}

```

--------------------------------

### Configure Agent with Tools

Source: https://v6.ai-sdk.dev/docs/agents/building-agents

Define an agent with executable tools using Zod schema validation. Tools enable agents to perform actions beyond text generation.

```TypeScript
import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

const codeAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  tools: {
    runCode: tool({
      description: 'Execute Python code',
      inputSchema: z.object({
        code: z.string(),
      }),
      execute: async ({ code }) => {
        // Execute code and return result
        return { output: 'Code executed successfully' };
      },
    }),
  },
});
```

--------------------------------

### Nest Streamable UIs within Components (React Server Components)

Source: https://v6.ai-sdk.dev/docs/advanced/multiple-streamables

This example shows how to create a streamable UI that contains another nested streamable UI. The `getStockHistoryChart` function returns a streamable UI that initially displays a spinner. Inside an async IIFE, it fetches stock price and creates another streamable UI for the history chart. Finally, it renders a `StockCard` component, passing the history chart streamable as a prop, which itself updates when new data is available.

```tsx
async function getStockHistoryChart({ symbol: string }) {
  'use server';

  const ui = createStreamableUI(<Spinner />);

  // We need to wrap this in an async IIFE to avoid blocking.
  (async () => {
    const price = await getStockPrice({ symbol });

    // Show a spinner as the history chart for now.
    const historyChart = createStreamableUI(<Spinner />);
    ui.done(<StockCard historyChart={historyChart.value} price={price} />);

    // Getting the history data and then update that part of the UI.
    const historyData = await fetch('https://my-stock-data-api.com');
    historyChart.done(<HistoryChart data={historyData} />);
  })();

  return ui;
}
```

--------------------------------

### MCPClient.getPrompt() - Retrieve Specific Prompt

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

Retrieves a prompt by name with optional arguments for customization. Arguments can be passed to fill placeholders or customize the prompt behavior.

```APIDOC
## getPrompt()

### Description
Retrieves a prompt by name, optionally passing arguments for customization.

### Method
Async

### Signature
```typescript
async (args: {
  name: string;
  arguments?: Record<string, unknown>;
  options?: RequestOptions;
}) => Promise<GetPromptResult>
```

### Parameters
#### Args (Required)
- **name** (string) - Required - Prompt name to retrieve.
- **arguments** (Record<string, unknown>) - Optional - Arguments to fill into the prompt template.
- **options** (RequestOptions) - Optional - Request options including signal and timeout.

### Returns
Promise<GetPromptResult> - A promise that resolves to the prompt data.

### Example Usage
```typescript
const prompt = await client.getPrompt({
  name: 'greeting-prompt'
});

// With arguments
const prompt = await client.getPrompt({
  name: 'personalized-greeting',
  arguments: { userName: 'John', language: 'en' },
  options: { timeout: 3000 }
});
```
```

--------------------------------

### Remove maxSteps and Implement Server-Side stopWhen for Multi-Step Tool Execution Control in TypeScript

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

Demonstrates migration from automatic tool result submission using maxSteps to server-side control with stopWhen and client-side manual submission. The server-side uses stepCountIs to limit execution steps, while the client configures automatic submission through sendAutomaticallyWhen and handles tool calls with onToolCall callback. Important: avoid awaiting addToolOutput inside onToolCall to prevent deadlocks.

```typescript
// AI SDK 4.0
const { messages, sendMessage } = useChat({
  maxSteps: 5, // Automatic tool result submission
});
```

```typescript
// AI SDK 5.0
// Server-side: Use stopWhen for multi-step control
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = await streamText({
  model: openai('gpt-4'),
  messages: convertToModelMessages(messages),
  stopWhen: stepCountIs(5), // Stop after 5 steps with tool calls
});

// Client-side: Configure automatic submission
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';

const { messages, sendMessage, addToolOutput } = useChat({
  // Automatically submit when all tool results are available
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

  async onToolCall({ toolCall }) {
    const result = await executeToolCall(toolCall);

    // Important: Don't await addToolOutput inside onToolCall to avoid deadlocks
    addToolOutput({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output: result,
    });
  },
});
```

--------------------------------

### Integrate Stock Component and Tool Handling in Page (TypeScriptX)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces

Shows how to integrate the custom `Stock` component and handle the `getStockPrice` tool within a React page component using the `useChat` hook from `@ai-sdk/react`. It manages chat messages, user input, and dynamically renders tool outputs or loading states.

```typescriptx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { Weather } from '@/components/weather';
import { Stock } from '@/components/stock';

export default function Page() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          <div>{message.role}</div>
          <div>
            {message.parts.map((part, index) => {
              if (part.type === 'text') {
                return <span key={index}>{part.text}</span>;
              }

              if (part.type === 'tool-displayWeather') {
                switch (part.state) {
                  case 'input-available':
                    return <div key={index}>Loading weather...</div>;
                  case 'output-available':
                    return (
                      <div key={index}>
                        <Weather {...part.output} />
                      </div>
                    );
                  case 'output-error':
                    return <div key={index}>Error: {part.errorText}</div>;
                  default:
                    return null;
                }
              }

              if (part.type === 'tool-getStockPrice') {
                switch (part.state) {
                  case 'input-available':
                    return <div key={index}>Loading stock price...</div>;
                  case 'output-available':
                    return (
                      <div key={index}>
                        <Stock {...part.output} />
                      </div>
                    );
                  case 'output-error':
                    return <div key={index}>Error: {part.errorText}</div>;
                  default:
                    return null;
                }
              }

              return null;
            })}
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

```

--------------------------------

### Update React Native Chat UI to Display AI Tool Invocations (TypeScript/React)

Source: https://v6.ai-sdk.dev/docs/getting-started/expo

This code snippet updates the `app/(tabs)/index.tsx` file in a React Native application to handle and display different types of AI tool parts within a chat interface. It specifically adds logic to the `messages.map` function to check for `tool-weather` and `tool-convertFahrenheitToCelsius` part types, rendering their JSON representation in the UI. This allows users to see when and how AI tools are being invoked during a conversation.

```tsx
import { generateAPIUrl } from '@/utils';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { useState } from 'react';
import { View, TextInput, ScrollView, Text, SafeAreaView } from 'react-native';

export default function App() {
  const [input, setInput] = useState('');
  const { messages, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl('/api/chat'),
    }),
    onError: error => console.error(error, 'ERROR'),
  });

  if (error) return <Text>{error.message}</Text>;

  return (
    <SafeAreaView style={{ height: '100%' }}>
      <View
        style={{
          height: '95%',
          display: 'flex',
          flexDirection: 'column',
          paddingHorizontal: 8,
        }}
      >
        <ScrollView style={{ flex: 1 }}>
          {messages.map(m => (
            <View key={m.id} style={{ marginVertical: 8 }}>
              <View>
                <Text style={{ fontWeight: 700 }}>{m.role}</Text>
                {m.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      return <Text key={`${m.id}-${i}`}>{part.text}</Text>;
                    case 'tool-weather':
                    case 'tool-convertFahrenheitToCelsius':
                      return (
                        <Text key={`${m.id}-${i}`}>
                          {JSON.stringify(part, null, 2)}
                        </Text>
                      );
                  }
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={{ marginTop: 8 }}>
          <TextInput
            style={{ backgroundColor: 'white', padding: 8 }}
            placeholder="Say something..."
            value={input}
            onChange={e => setInput(e.nativeEvent.text)}
            onSubmitEditing={e => {
              e.preventDefault();
              sendMessage({ text: input });
              setInput('');
            }}
            autoFocus={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
```

--------------------------------

### Replace Google Facade with createGoogleGenerativeAI Function

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-4-0

Details the replacement of the `Google` facade with the `createGoogleGenerativeAI` function for the Google Generative AI provider. This is a structural change in provider initialization.

```typescript
const google = new Google({
  // ...
});

```

```typescript
const google = createGoogleGenerativeAI({
  // ...
});

```

--------------------------------

### Refine Custom Loader for Specific Part Types in `useChat` (React)

Source: https://v6.ai-sdk.dev/docs/troubleshooting/streaming-status-delay

This snippet refines the custom loading logic for `useChat` by checking for the presence of specific part types, such as 'text'. It sets `showLoader` to true if the status is 'streaming' and no text parts have yet arrived in the last assistant message. This is useful when waiting for particular content types (e.g., text, images, etc.) to start streaming.

```tsx
const showLoader =
  status === 'streaming' &&
  lastMessage?.role === 'assistant' &&
  !lastMessage?.parts?.some(part => part.type === 'text');
```

--------------------------------

### Enable Function Calls with Gemma Models using gemmaToolMiddleware

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/middleware

This snippet demonstrates how to enable function calling for Gemma models that do not natively support it by utilizing the `gemmaToolMiddleware` from the `@ai-sdk-tool/parser` package. It wraps a language model, applying the middleware to translate function schemas into instructions and parse responses.

```typescript
import { wrapLanguageModel } from 'ai';
import { gemmaToolMiddleware } from '@ai-sdk-tool/parser';

const model = wrapLanguageModel({
  model: openrouter('google/gemma-3-27b-it'),
  middleware: gemmaToolMiddleware,
});
```

--------------------------------

### Initialize MCP Client with HTTP Transport - TypeScript

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

Creates an MCP client using direct HTTP transport configuration. This is the recommended approach for production deployments. Supports optional HTTP headers and OAuth authentication provider for automatic authorization.

```typescript
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

const mcpClient = await createMCPClient({
  transport: {
    type: 'http',
    url: 'https://your-server.com/mcp',

    // optional: configure HTTP headers
    headers: { Authorization: 'Bearer my-api-key' },

    // optional: provide an OAuth client provider for automatic authorization
    authProvider: myOAuthClientProvider,
  },
});
```

--------------------------------

### Send Messages using useChat Hook with Chat ID (React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui

This 'After' example shows how to use the `useChat` hook with a specific `chatId` to synchronize messages across components. It utilizes the `append` function to add user messages to the chat, ensuring consistency with the parent component's chat state. The `body` option is used to pass the chat ID to the server action.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';

export function ListFlights({ chatId, flights }) {
  const { append } = useChat({
    id: chatId,
    body: { id: chatId },
    maxSteps: 5,
  });

  return (
    <div>
      {flights.map(flight => (
        <div
          key={flight.id}
          onClick={async () => {
            await append({
              role: 'user',
              content: `I would like to choose flight ${flight.id}!`,
            });
          }}
        >
          {flight.name}
        </div>
      ))}
    </div>
  );
}

```

--------------------------------

### Render Dynamic Tool Invocations in UI (AI SDK 5.0)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

Illustrates how UI messages now include a `dynamic-tool` part type for rendering dynamic tool invocations. This allows for a generic handling of dynamic tool outputs, while static tools continue to use specific type parts for their UI representation.

```tsx
{
  message.parts.map((part, index) => {
    switch (part.type) {
      // Static tools use specific types
      case 'tool-weather':
        return <div>Weather: {part.input.city}</div>;

      // Dynamic tools use the generic dynamic-tool type
      case 'dynamic-tool':
        return (
          <div>
            Dynamic tool: {part.toolName}
            <pre>{JSON.stringify(part.input, null, 2)}</pre>
          </div>
        );
    }
  });
}
```

--------------------------------

### Importing defaultSettingsMiddleware - TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/default-settings-middleware

Imports the defaultSettingsMiddleware function from the 'ai' library. This function is essential for applying default configurations to language model calls.

```typescript
import { defaultSettingsMiddleware } from 'ai';
```

--------------------------------

### Configure provider options at message part level

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

Shows how to set provider-specific options like imageDetail for individual message parts in AI SDK messages

```typescript
import { ModelMessage } from 'ai';

const messages: ModelMessage[] = [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Describe the image in detail.',
        providerOptions: {
          openai: { imageDetail: 'low' },
        },
      },
      {
        type: 'image',
        image:
          'https://github.com/vercel/ai/blob/main/examples/ai-core/data/comic-cat.png?raw=true',
        providerOptions: {
          openai: { imageDetail: 'low' },
        },
      },
    ],
  },
];
```

--------------------------------

### Implement Svelte Chat UI with AI SDK

Source: https://v6.ai-sdk.dev/docs/getting-started/svelte

This Svelte component integrates the `@ai-sdk/svelte` `Chat` class to create a basic chat interface. It displays messages, handles user input through a form, and submits messages to the LLM via a `handleSubmit` function. The component uses local state for the input field and iterates through `chat.messages` to render the conversation, accessing LLM responses via the `message.parts` array.

```svelte
<script lang="ts">
  import { Chat } from '@ai-sdk/svelte';

  let input = '';
  const chat = new Chat({});

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    chat.sendMessage({ text: input });
    input = '';
  }
</script>

<main>
  <ul>
    {#each chat.messages as message, messageIndex (messageIndex)}
      <li>
        <div>{message.role}</div>
        <div>
          {#each message.parts as part, partIndex (partIndex)}
            {#if part.type === 'text'}
              <div>{part.text}</div>
            {/if}
          {/each}
        </div>
      </li>
    {/each}
  </ul>
  <form onsubmit={handleSubmit}>
    <input bind:value={input} />
    <button type="submit">Send</button>
  </form>
</main>
```

--------------------------------

### Handle tool and stream errors for UI message responses (TypeScript/TSX)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage

Provides utilities and usage examples to convert various error shapes into strings and to surface errors to the UI via onError. Dependencies: none beyond runtime (used with toUIMessageStreamResponse or createUIMessageResponse). Input: unknown error; Output: string or custom error message forwarded to the UI. Limitation: avoid exposing sensitive internal details when surfacing errors.

```tsx
export function errorHandler(error: unknown) {
  if (error == null) {
    return 'unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

```

```tsx
const result = streamText({
  // ...
});

return result.toUIMessageStreamResponse({
  onError: errorHandler,
});

```

```tsx
const response = createUIMessageResponse({
  // ...
  async execute(dataStream) {
    // ...
  },
  onError: error => `Custom error: ${error.message}`,
});

```

--------------------------------

### Speech Generation API Response

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/generate-speech

Details the structure of a successful response from the speech generation API, outlining the format of the generated audio, warnings, and model-specific metadata.

```APIDOC
## Response Structure for Speech Generation API

### Description
This section details the structure of a successful response from the speech generation API, typically returned after a successful audio generation request.

### Response
#### Success Response (200)
- **audio** (GeneratedAudioFile) - The generated audio details.
  - **base64** (string) - Audio as a base64 encoded string.
  - **uint8Array** (Uint8Array) - Audio as a Uint8Array (JavaScript TypedArray).
  - **mimeType** (string) - MIME type of the audio (e.g., "audio/mpeg").
  - **format** (string) - Format of the audio (e.g., "mp3").
- **warnings** (Array<SpeechWarning>) - Warnings from the model provider (e.g., unsupported settings).
- **responses** (Array<SpeechModelResponseMetadata>) - Response metadata from the provider. There may be multiple responses if multiple calls were made to the model.
  - **timestamp** (Date) - Timestamp for the start of the generated response.
  - **modelId** (string) - The ID of the response model that was used to generate the response.
  - **body** (unknown) - Optional response body.
  - **headers** (Record<string, string>) - Optional response headers.

#### Response Example
```json
{
  "audio": {
    "base64": "SUQzBAAAAAAAKqAABVAAAAMABVAAD//w...",
    "uint8Array": [
      73, 68, 51, 4, 0, 0, 0, 0, 0, 3, 84, 83, 83, 69, 0, 0, 0, 11, 0, 0, 0, 3,
      108, 97, 118, 102, 53, 56, 46, 52, 53, 46, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ],
    "mimeType": "audio/mpeg",
    "format": "mp3"
  },
  "warnings": [
    "Unsupported setting 'pitch' adjusted to default."
  ],
  "responses": [
    {
      "timestamp": "2023-10-27T10:00:00.000Z",
      "modelId": "openai-tts-1",
      "body": null,
      "headers": {
        "x-request-id": "req_abcefg123456",
        "content-type": "audio/mpeg"
      }
    }
  ]
}
```
```

--------------------------------

### Mocking generateObject with AI SDK Core

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/testing

Shows how to test the `generateObject` function using `MockLanguageModelV3` to return a predefined JSON object as text content. This enables reliable unit testing for schema-based output generation.

```typescript
import { generateObject } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';

const result = await generateObject({
  model: new MockLanguageModelV3({
    doGenerate: async () => ({
      finishReason: 'stop',
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      content: [{ type: 'text', text: `{"content":"Hello, world!"}` }],
      warnings: [],
    }),
  }),
  schema: z.object({ content: z.string() }),
  prompt: 'Hello, test!',
});
```

--------------------------------

### Customize the Resume Endpoint

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams

Demonstrates how to customize the resume endpoint URL, credentials, and headers using the `prepareReconnectToStreamRequest` option in `DefaultChatTransport`.

```APIDOC
## Customize the Resume Endpoint

### Description
By default, the `useChat` hook sends a GET request to `/api/chat/[id]/stream` to resume a chat stream. The `DefaultChatTransport` allows customization of this behavior through the `prepareReconnectToStreamRequest` option.

### Method
Configuration within `useChat` hook.

### Endpoint
Configurable via `prepareReconnectToStreamRequest`.

### Parameters
#### Request Body (for `prepareReconnectToStreamRequest` callback)
- **id** (string) - Required - The chat ID for which to prepare the reconnect request.

#### Options within `prepareReconnectToStreamRequest` return object:
- **api** (string) - Required - The URL for the resume endpoint. Can use default pattern or a custom one (e.g., `/api/streams/${id}/resume`, `/api/resume-chat?id=${id}`).
- **credentials** (string) - Optional - Controls whether credentials (like cookies or Authorization headers) should be sent with the request. Common values are `'include'` or `'omit'`.
- **headers** (object) - Optional - An object containing custom headers to be sent with the request (e.g., `Authorization: 'Bearer token'`, `'X-Custom-Header': 'value'`).

### Request Example (within `useChat` hook)
```tsx
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

export function Chat({ chatData, resume }) {
  const { messages, sendMessage } = useChat({
    id: chatData.id,
    messages: chatData.messages,
    resume,
    transport: new DefaultChatTransport({
      prepareReconnectToStreamRequest: ({ id }) => {
        return {
          api: `/api/chat/${id}/stream`, // Default pattern
          // Or use a different pattern:
          // api: `/api/streams/${id}/resume`,
          // api: `/api/resume-chat?id=${id}`,
          credentials: 'include', // Include cookies/auth
          headers: {
            Authorization: 'Bearer token',
            'X-Custom-Header': 'value',
          },
        };
      },
    }),
  });

  return <div>{/* Your chat UI */}</div>;
}
```

### Response
This configuration affects the client-side request made to the resume endpoint. The server-side response handling for the resume endpoint (e.g., 200 OK or 204 No Content) remains as described in the GET /api/chat/[id]/stream documentation.
```

--------------------------------

### Stream Text Generation using AI SDK with OpenAI

Source: https://v6.ai-sdk.dev/docs/advanced/why-streaming

This code snippet demonstrates how to use the AI SDK's `streamText` function to generate text from an OpenAI model (gpt-4.1) in a streaming manner. It initializes a text stream with a prompt and then asynchronously iterates over the `textStream` to log each incoming text part to the console as it becomes available, illustrating a basic streaming UI implementation.

```javascript
import { streamText } from 'ai';


const { textStream } = streamText({
  model: 'openai/gpt-4.1',
  prompt: 'Write a poem about embedding models.',
});


for await (const textPart of textStream) {
  console.log(textPart);
}
```

--------------------------------

### Initialize MCP Client with SSE Transport

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

Configures the MCP client to use Server-Sent Events (SSE) for communication. This is an alternative HTTP-based transport that supports `url`, `headers`, and `authProvider`.

```APIDOC
## SDK Function: `experimental_createMCPClient`

### Description
Initializes an MCP client using Server-Sent Events (SSE) transport. This provides an alternative HTTP-based communication channel to the MCP server, suitable for environments that benefit from push-based updates.

### Function Signature
`experimental_createMCPClient(config: MCPClientConfig)`

### Configuration Object (`MCPClientConfig`)
- **transport** (object) - Required - Configuration for the SSE transport layer.
  - **type** (string) - Required - Must be `'sse'`.
  - **url** (string) - Required - The base URL of the SSE endpoint on the MCP server, e.g., `'https://my-server.com/sse'`.
  - **headers** (object) - Optional - Key-value pairs for custom HTTP headers, e.g., `{ Authorization: 'Bearer my-api-key' }`.
  - **authProvider** (object) - Optional - An OAuth client provider instance for automatic authorization.

### Example Usage
```typescript
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

const mcpClient = await createMCPClient({
  transport: {
    type: 'sse',
    url: 'https://my-server.com/sse',
    headers: { Authorization: 'Bearer my-api-key' },
    authProvider: myOAuthClientProvider,
  },
});
```

### Return Value
- **mcpClient** (object) - An instance of the configured MCP client.
```

--------------------------------

### Importing `useAIState`

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-rsc/use-ai-state

Demonstrates how to import the `useAIState` hook from the `@ai-sdk/rsc` package. This is the primary way to bring the hook into your React Server Components.

```typescript
import { useAIState } from "@ai-sdk/rsc"
```

--------------------------------

### Mocking generateText with AI SDK Core

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/testing

Demonstrates how to use `MockLanguageModelV3` to unit test the `generateText` function, providing a deterministic response for text generation without real API calls. This ensures consistent output for your test cases.

```typescript
import { generateText } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

const result = await generateText({
  model: new MockLanguageModelV3({
    doGenerate: async () => ({
      finishReason: 'stop',
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      content: [{ type: 'text', text: `Hello, world!` }],
      warnings: [],
    }),
  }),
  prompt: 'Hello, test!',
});
```

--------------------------------

### Define Structured Output

Source: https://v6.ai-sdk.dev/docs/agents/building-agents

Configure agents to return structured data using Zod schema validation. Enforces consistent output format for analysis tasks.

```TypeScript
import { ToolLoopAgent, Output, stepCountIs } from 'ai';
import { z } from 'zod';

const analysisAgent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  output: Output.object({
    schema: z.object({
      sentiment: z.enum(['positive', 'neutral', 'negative']),
      summary: z.string(),
      keyPoints: z.array(z.string()),
    }),
  }),
  stopWhen: stepCountIs(10),
});

const { output } = await analysisAgent.generate({
  prompt: 'Analyze customer feedback from the last quarter',
});
```

--------------------------------

### Define a Tool for Weather Information (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces

Defines a reusable tool named `weatherTool` using the AI SDK's `createTool` function. This tool simulates fetching weather data for a specified location and has a defined input schema using Zod. It returns mock data after a delay. Dependencies include `ai` and `zod`.

```ts
import { tool as createTool } from 'ai';
import { z } from 'zod';

export const weatherTool = createTool({
  description: 'Display the weather for a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async function ({ location }) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { weather: 'Sunny', temperature: 75, location };
  },
});

export const tools = {
  displayWeather: weatherTool,
};

```

--------------------------------

### Generate Text from MP3 Buffer

Source: https://v6.ai-sdk.dev/docs/foundations/prompts

This snippet shows how to generate text from an MP3 audio file provided as a Buffer. It utilizes the `generateText` function from the 'ai' library and specifies the model and messages, including the audio file content. Ensure the 'fs' module is imported for file system operations.

```ts
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import fs from 'fs';

const result = await generateText({
  model: openai('gpt-5-mini-audio-preview'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What is the audio saying?' },
        {
          type: 'file',
          mediaType: 'audio/mpeg',
          data: fs.readFileSync('./data/galileo.mp3'),
        },
      ],
    },
  ],
});
```

--------------------------------

### Generate Speech from Text using OpenAI TTS

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/speech

This snippet demonstrates the basic usage of `generateSpeech` to create audio from a given text using the OpenAI TTS model. It requires importing the `generateSpeech` function and the desired model configuration.

```typescript
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { openai } from '@ai-sdk/openai';

const audio = await generateSpeech({
  model: openai.speech('tts-1'),
  text: 'Hello, world!',
  voice: 'alloy',
});
```

--------------------------------

### Language Model Configuration Parameters

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/generate-text

This section outlines the input parameters used to configure and send requests to a language model or chat API. It details how to specify the model, provide system instructions, and structure a conversation using various message and content types.

```APIDOC
## Language Model Configuration Parameters

### Description
Defines the input parameters for configuring a language model or chat API request.

### Parameters
#### Request Body
- **model** (LanguageModel) - Required - The language model to use. Example: openai('gpt-5-mini')
- **system** (string) - Required - The system prompt to use that specifies the behavior of the model.
- **prompt** (string | Array<SystemModelMessage | UserModelMessage | AssistantModelMessage | ToolModelMessage>) - Required - The input prompt to generate the text from.
- **messages** (Array<SystemModelMessage | UserModelMessage | AssistantModelMessage | ToolModelMessage>) - Required - A list of messages that represent a conversation. Automatically converts UI messages from the useChat hook.
  - **SystemModelMessage** (object)
    - **role** ('system') - Required - The role for the system message.
    - **content** (string) - Required - The content of the message.
  - **UserModelMessage** (object)
    - **role** ('user') - Required - The role for the user message.
    - **content** (string | Array<TextPart | ImagePart | FilePart>) - Required - The content of the message.
      - **TextPart** (object)
        - **type** ('text') - Required - The type of the message part.
        - **text** (string) - Required - The text content of the message part.
      - **ImagePart** (object)
        - **type** ('image') - Required - The type of the message part.
        - **image** (string | Uint8Array | Buffer | ArrayBuffer | URL) - Required - The image content of the message part. String are either base64 encoded content, base64 data URLs, or http(s) URLs.
        - **mediaType** (string) - Optional - The IANA media type of the image.
      - **FilePart** (object)
        - **type** ('file') - Required - The type of the message part.
        - **data** (string | Uint8Array | Buffer | ArrayBuffer | URL) - Required - The file content of the message part. String are either base64 encoded content, base64 data URLs, or http(s) URLs.
        - **mediaType** (string) - Required - The IANA media type of the file.
  - **AssistantModelMessage** (object)
    - **role** ('assistant') - Required - The role for the assistant message.
    - **content** (string | Array<TextPart | FilePart | ReasoningPart | ToolCallPart>) - Required - The content of the message.
      - **TextPart** (object)
        - **type** ('text') - Required - The type of the message part.
        - **text** (string) - Required - The text content of the message part.

```

--------------------------------

### Include binary image in user messages

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

Shows how to include binary image data (Buffer) in user messages for AI models to process

```typescript
const result = await generateText({
  model,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe the image in detail.' },
        {
          type: 'image',
          image: fs.readFileSync('./data/comic-cat.png'),
        },
      ],
    },
  ],
});
```

--------------------------------

### Integrate Weather Tool in AI SDK Route Handler (TypeScript)

Source: https://v6.ai-sdk.dev/docs/getting-started/nextjs-app-router

This TypeScript code defines a 'weather' tool within an AI SDK route handler, using `zod` for input schema validation. It outlines the tool's description, `location` input, and a simulated `execute` function to return weather data, demonstrating how to extend chatbot capabilities with custom server-side logic. This snippet runs on the server and integrates with the `ai` package's `streamText` function.

```tsx
import { streamText, UIMessage, convertToModelMessages, tool } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'openai/gpt-5.1',
    messages: convertToModelMessages(messages),
    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
```

--------------------------------

### Access Detailed Step Information in AI SDK Agent (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/loop-control

Explains how to access comprehensive information about the current and previous steps within the `prepareStep` callback, including model configuration, step number, and previous tool calls/results. This enables complex decision-making, such as routing to specific tools based on execution history or prior tool outputs.

```ts
prepareStep: async ({
  model, // Current model configuration
  stepNumber, // Current step number (0-indexed)
  steps, // All previous steps with their results
  messages, // Messages to be sent to the model
}) => {
  // Access previous tool calls and results
  const previousToolCalls = steps.flatMap(step => step.toolCalls);
  const previousResults = steps.flatMap(step => step.toolResults);

  // Make decisions based on execution history
  if (previousToolCalls.some(call => call.toolName === 'dataAnalysis')) {
    return {
      toolChoice: { type: 'tool', toolName: 'reportGenerator' },
    };
  }

  return {};
},
```

--------------------------------

### Update imports from @ai-sdk/ui-utils to main 'ai' package

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This snippet shows how to update import paths after the `@ai-sdk/ui-utils` package was removed. Functionalities like `getTextFromDataUrl` are now exported directly from the main `ai` package.

```tsx
import { getTextFromDataUrl } from '@ai-sdk/ui-utils';
```

```tsx
import { getTextFromDataUrl } from 'ai';
```

--------------------------------

### Use Default Settings Middleware - TypeScript

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/middleware

Shows how to apply default settings to a language model using `defaultSettingsMiddleware`. This middleware allows configuring parameters like temperature, max output tokens, and provider-specific options.

```typescript
import { wrapLanguageModel, defaultSettingsMiddleware } from 'ai';

const model = wrapLanguageModel({
  model: yourModel,
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 0.5,
      maxOutputTokens: 800,
      providerOptions: { openai: { store: false } },
    },
  }),
});
```

--------------------------------

### Load Chat During Static Page Generation

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui

This Next.js page component demonstrates loading a chat from the database during static generation. It fetches chat data by ID, converts the messages to the UI format, and passes them as `initialMessages` to the `Chat` component.

```tsx
import { Chat } from '@/app/components/chat';
import { getChatById } from '@/utils/queries';

// link to example implementation: https://github.com/vercel/ai-chatbot/blob/00b125378c998d19ef60b73fe576df0fe5a0e9d4/lib/utils.ts#L87-L127
import { convertToUIMessages } from '@/utils/functions';

export default async function Page({ params }: { params: any }) {
  const { id } = params;
  const chatFromDb = await getChatById({ id });

  const chat: Chat = {
    ...chatFromDb,
    messages: convertToUIMessages(chatFromDb.messages),
  };

  return <Chat key={id} id={chat.id} initialMessages={chat.messages} />; 
}
```

--------------------------------

### Basic Usage of `pipeAgentUIStreamToResponse`

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/pipe-agent-ui-stream-to-response

Demonstrates the basic usage of `pipeAgentUIStreamToResponse` within a Node.js handler. It takes a `ServerResponse` object, an `Agent` instance, and an array of `messages` as input to stream UI messages.

```typescript
import { pipeAgentUIStreamToResponse } from 'ai';
import { MyCustomAgent } from './agent';

export async function handler(req, res) {
  const { messages } = JSON.parse(req.body);

  await pipeAgentUIStreamToResponse({
    response: res, // Node.js ServerResponse
    agent: MyCustomAgent,
    messages,
    // ...other optional streaming options
  });
}
```

--------------------------------

### Rendering AI SDK Tool Invocations (v4 vs. v5)

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This snippet demonstrates how to render tool invocations in AI SDK. Version 4 uses a direct `tool-invocation` type, while version 5 introduces `isToolUIPart` and `getToolName` helpers for a more robust, catch-all approach. It showcases rendering tool states (calling or result/output-available) within a React component.

```tsx
{
  message.parts.map((part, index) => {
    switch (part.type) {
      case 'text':
        return <div key={index}>{part.text}</div>;
      case 'tool-invocation':
        const { toolInvocation } = part;
        return (
          <details key={`tool-${toolInvocation.toolCallId}`}>
            <summary>
              <span>{toolInvocation.toolName}</span>
              {toolInvocation.state === 'result' ? (
                <span>Click to expand</span>
              ) : (
                <span>calling...</span>
              )}
            </summary>
            {toolInvocation.state === 'result' ? (
              <div>
                <pre>{JSON.stringify(toolInvocation.result, null, 2)}</pre>
              </div>
            ) : null}
          </details>
        );
    }
  });
}
```

```tsx
import { isToolUIPart, getToolName } from 'ai';

{
  message.parts.map((part, index) => {
    switch (part.type) {
      case 'text':
        return <div key={index}>{part.text}</div>;
      default:
        if (isToolUIPart(part)) {
          const toolInvocation = part;
          return (
            <details key={`tool-${toolInvocation.toolCallId}`}>
              <summary>
                <span>{getToolName(toolInvocation)}</span>
                {toolInvocation.state === 'output-available' ? (
                  <span>Click to expand</span>
                ) : (
                  <span>calling...</span>
                )}
              </summary>
              {toolInvocation.state === 'output-available' ? (
                <div>
                  <pre>{JSON.stringify(toolInvocation.output, null, 2)}</pre>
                </div>
              ) : null}
            </details>
          );
        }
    }
  });
}
```

--------------------------------

### Implement Custom Download Function in AI SDK (JavaScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

This snippet demonstrates how to use the `experimental_download` property in the AI SDK to provide a custom function for handling file downloads. This allows for implementing advanced logic like throttling, retries, authentication, or caching for files referenced in user messages. The function receives an array of requested downloads and should return an array of corresponding file data or null.

```javascript
const result = await generateText({
  model: openai('gpt-5-mini'),
  experimental_download: async (
    requestedDownloads: Array<{
      url: URL;
      isUrlSupportedByModel: boolean;
    }>,
  ): PromiseLike<
    Array<{
      data: Uint8Array;
      mediaType: string | undefined;
    } | null>
  > => {
    // ... download the files and return an array with similar order
  },
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'file',
          data: new URL('https://api.company.com/private/document.pdf'),
          mediaType: 'application/pdf',
        },
      ],
    },
  ],
});
```

--------------------------------

### Import experimental_createMCPClient function

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client

Imports the `experimental_createMCPClient` function from the `@ai-sdk/mcp` package. This function is used to initialize a new Model Context Protocol (MCP) client within a TypeScript or JavaScript application.

```typescript
import { experimental_createMCPClient } from "@ai-sdk/mcp"
```

--------------------------------

### Import createAgentUIStream Function (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-agent-ui-stream

Demonstrates the standard way to import the `createAgentUIStream` function from the `ai` SDK, making it available for use in your TypeScript project.

```typescript
import { createAgentUIStream } from "ai"
```

--------------------------------

### Dynamic Model Selection in prepareStep

Source: https://v6.ai-sdk.dev/docs/agents/loop-control

Uses the prepareStep callback to dynamically switch to a more powerful model based on step requirements and conversation complexity, enabling adaptive reasoning capabilities.

```TypeScript
import { ToolLoopAgent } from 'ai';

const agent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini', // Default model
  tools: {
    // your tools
  },
  prepareStep: async ({ stepNumber, messages }) => {
    // Use a stronger model for complex reasoning after initial steps
    if (stepNumber > 2 && messages.length > 10) {
      return {
        model: 'openai/gpt-5-mini',
      };
    }
    // Continue with default settings
    return {};
  },
});

const result = await agent.generate({
  prompt: '...',
});
```

--------------------------------

### TypeScript: Calling and Responding to Tools

Source: https://v6.ai-sdk.dev/docs/foundations/prompts

Demonstrates how to send tool calls within an assistant message and receive tool results in a tool message. This pattern is used for function calling, allowing the LLM to interact with external tools or functions. It supports parallel tool calls and results.

```typescript
const result = await generateText({
  model: 'openai/gpt-4.1',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'How many calories are in this block of cheese?'
        },
        { type: 'image', image: fs.readFileSync('./data/roquefort.jpg') }
      ]
    },
    {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId: '12345',
          toolName: 'get-nutrition-data',
          input: { cheese: 'Roquefort' }
        },
        // there could be more tool calls here (parallel calling)
      ]
    },
    {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: '12345', // needs to match the tool call id
          toolName: 'get-nutrition-data',
          output: {
            type: 'json',
            value: {
              name: 'Cheese, roquefort',
              calories: 369,
              fat: 31,
              protein: 22
            }
          }
        },
        // there could be more tool results here (parallel calling)
      ]
    }
  ]
});
```

--------------------------------

### Update API Route to Include AI Weather Tool (TypeScript)

Source: https://v6.ai-sdk.dev/docs/getting-started/svelte

This code snippet demonstrates how to modify an AI chatbot's API route to integrate a new weather tool using the AI SDK. It defines the tool's description, input schema with `zod`, and an `execute` function to simulate weather data retrieval. This enables the AI model to call the tool based on user queries.

```tsx
import {
  createGateway,
  streamText,
  type UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from 'ai';
import { z } from 'zod';

import { AI_GATEWAY_API_KEY } from '$env/static/private';

const gateway = createGateway({
  apiKey: AI_GATEWAY_API_KEY,
});

export async function POST({ request }) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: gateway('openai/gpt-5.1'),
    messages: convertToModelMessages(messages),
    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
```

--------------------------------

### Control Agent Loop Steps

Source: https://v6.ai-sdk.dev/docs/agents/building-agents

Configure stop conditions for agent loop execution using stepCountIs. Controls how many tool calls or generations agent can perform.

```TypeScript
import { ToolLoopAgent, stepCountIs } from 'ai';

const agent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  stopWhen: stepCountIs(20), // Allow up to 20 steps
});
```

```TypeScript
import { ToolLoopAgent, stepCountIs } from 'ai';

const agent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  stopWhen: [
    stepCountIs(20), // Maximum 20 steps
    yourCustomCondition(), // Custom logic for when to stop
  ],
});
```

--------------------------------

### Inferring ToolSet UI Types with AI SDK

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot

The InferUITools type helper infers the input and output types for an entire ToolSet. This is beneficial for managing multiple tools within a UI context. It processes a ToolSet object and generates a type that maps each tool's name to its inferred input and output types. Dependencies include the 'ai' package and 'zod'.

```tsx
import { InferUITools, ToolSet } from 'ai';
import { z } from 'zod';

const tools = {
  weather: {
    description: 'Get the current weather',
    inputSchema: z.object({
      location: z.string().describe('The city and state'),
    }),
    execute: async ({ location }) => {
      return `The weather in ${location} is sunny.`;
    },
  },
  calculator: {
    description: 'Perform basic arithmetic',
    inputSchema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number(),
    }),
    execute: async ({ operation, a, b }) => {
      switch (operation) {
        case 'add':
          return a + b;
        case 'subtract':
          return a - b;
        case 'multiply':
          return a * b;
        case 'divide':
          return a / b;
      }
    },
  },
} satisfies ToolSet;

// Infer the types from the tool set
type MyUITools = InferUITools<typeof tools>;
// This creates a type with:
// {
//   weather: { input: { location: string }; output: string };
//   calculator: { input: { operation: 'add' | 'subtract' | 'multiply' | 'divide'; a: number; b: number }; output: number };
// }
```

--------------------------------

### Save Chats using Server Action with AI SDK

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui

This server action configures the AI SDK's `createAI` function. It utilizes the `onSetAIState` callback to asynchronously save the chat state to the database whenever the AI state is set and marked as 'done'.

```ts
import { createAI } from '@ai-sdk/rsc';
import { saveChat } from '@/utils/queries';

export const AI = createAI({
  initialAIState: {},
  initialUIState: {},
  actions: {
    // server actions
  },
  onSetAIState: async ({ state, done }) => {
    'use server';

    if (done) {
      await saveChat(state);
    }
  },
});
```

--------------------------------

### Define AI Text Generation Server Action (TypeScript)

Source: https://v6.ai-sdk.dev/docs/troubleshooting/common-issues/server-actions-in-client-components

This Server Action demonstrates how to define an asynchronous function using the AI SDK to generate text based on a prompt. It leverages OpenAI's 'gpt-3.5-turbo' model and is intended to be exported from a separate file with `'use server'` at the top, making it accessible from Client Components without inline 'use server' declarations. It requires '@ai-sdk/openai' and 'ai' packages.

```typescript
'use server';


import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';


export async function getAnswer(question: string) {
  'use server';


  const { text } = await generateText({
    model: openai.chat('gpt-3.5-turbo'),
    prompt: question,
  });


  return { answer: text };
}
```

--------------------------------

### Common AI SDK Settings

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/settings

This section details the common settings that can be applied to AI SDK functions to modify language model behavior and output.

```APIDOC
## Common AI SDK Settings

### Description
Large language models (LLMs) typically provide settings to augment their output. All AI SDK functions support the following common settings in addition to the model, the [prompt](./prompts), and additional provider-specific settings.

### Parameters

#### Common Settings
- **model** (string) - Required - The identifier for the language model to use.
- **maxOutputTokens** (number) - Optional - Maximum number of tokens to generate.
- **temperature** (number) - Optional - Temperature setting for controlling randomness. Recommended to set either `temperature` or `topP`, but not both.
- **topP** (number) - Optional - Nucleus sampling parameter. Recommended to set either `temperature` or `topP`, but not both.
- **topK** (number) - Optional - Limits sampling to the top K options for each subsequent token. Recommended for advanced use cases.
- **presencePenalty** (number) - Optional - Affects the likelihood of repeating information already present in the prompt.
- **frequencyPenalty** (number) - Optional - Affects the likelihood of repeatedly using the same words or phrases.
- **stopSequences** (string[]) - Optional - Sequences that will stop text generation when encountered.
- **seed** (integer) - Optional - Seed for random sampling to ensure deterministic results if supported by the model.
- **maxRetries** (number) - Optional - Maximum number of retries. Set to 0 to disable retries. Default: `2`.
- **abortSignal** (AbortSignal) - Optional - An optional abort signal to cancel the call, useful for timeouts.
- **headers** (object) - Optional - Additional HTTP headers to be sent with the request, applicable for HTTP-based providers.

### Request Example
```ts
const result = await generateText({
  model: 'openai/gpt-4.1',
  maxOutputTokens: 512,
  temperature: 0.3,
  maxRetries: 5,
  prompt: 'Invent a new holiday and describe its traditions.',
});
```

### Notes
- Some providers may not support all common settings. Using an unsupported setting will generate a warning, which can be checked in the `warnings` property of the result object.
- For `temperature`, a value of `0` means almost deterministic results, and higher values mean more randomness. In AI SDK 5.0, temperature is no longer set to `0` by default.
- For `topP`, values are typically between 0 and 1. For example, `0.1` considers only tokens with the top 10% probability mass.
- `temperature` and `topP` should ideally not be set simultaneously.
- The `headers` setting is for request-specific headers. Provider configuration can also include `headers` to be sent with all requests.

### `abortSignal` Example (Timeout)
```ts
const result = await generateText({
  model: openai('gpt-5-mini'),
  prompt: 'Invent a new holiday and describe its traditions.',
  abortSignal: AbortSignal.timeout(5000), // 5 seconds
});
```

### `headers` Example
```ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = await generateText({
  model: openai('gpt-5-mini'),
  prompt: 'Invent a new holiday and describe its traditions.',
  headers: {
    'Prompt-Id': 'my-prompt-id',
  },
});
```
```

--------------------------------

### Import simulateReadableStream from AI SDK (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/simulate-readable-stream

Imports the `simulateReadableStream` utility function from the 'ai' package. This function is used to create mock ReadableStreams for testing purposes.

```typescript
import { simulateReadableStream } from "ai";
```

--------------------------------

### Import Chat Functionality into Frameworks

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat

This section demonstrates how to import the core chat functionality into your application across different frameworks supported by the AI SDK. Each import statement brings the necessary utilities for managing chat state and streaming messages.

```javascript
import { useChat } from '@ai-sdk/react'
```

```javascript
import { Chat } from '@ai-sdk/svelte'
```

```javascript
import { Chat } from '@ai-sdk/vue'
```

--------------------------------

### Stream UI with RSC Server Action (Before)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui

This code demonstrates the 'before' state of streaming chat completions using `streamUI` within a React Server Component (RSC) server action. It handles both message generation and UI streaming in a single action. Dependencies include `@ai-sdk/openai` and `@ai-sdk/rsc`.

```tsx
import { openai } from '@ai-sdk/openai';
import { getMutableAIState, streamUI } from '@ai-sdk/rsc';

export async function sendMessage(message: string) {
  'use server';

  const messages = getMutableAIState('messages');

  messages.update([...messages.get(), { role: 'user', content: message }]);

  const { value: stream } = await streamUI({
    model: openai('gpt-5-mini'),
    system: 'you are a friendly assistant!',
    messages: messages.get(),
    text: async function* ({ content, done }) {
      // process text
    },
    tools: {
      // tool definitions
    },
  });

  return stream;
}
```

--------------------------------

### Import Experimental_StdioMCPTransport

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/mcp-stdio-transport

Imports the Experimental_StdioMCPTransport from the 'ai/mcp-stdio' module. This is a Node.js-specific experimental feature.

```typescript
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio"
```

--------------------------------

### Enable Structured Outputs for OpenAI Models in AI SDK 4 and 5

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This snippet illustrates the migration of the `structuredOutputs` option for OpenAI models. In AI SDK 4, it was set as a direct model option. In AI SDK 5, `structuredOutputs` is now configured via `providerOptions` when using the Chat Completions API.

```tsx
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = await generateObject({
  model: openai('gpt-4.1', { structuredOutputs: true }), // use Chat Completions API
  schema: z.object({ name: z.string() }),
});
```

```tsx
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai, type OpenAIChatLanguageModelOptions } from '@ai-sdk/openai';

const result = await generateObject({
  model: openai.chat('gpt-4.1'), // use Chat Completions API
  schema: z.object({ name: z.string() }),
  providerOptions: {
    openai: {
      structuredOutputs: true,
    } satisfies OpenAIChatLanguageModelOptions,
  },
});
```

--------------------------------

### Import simulateStreamingMiddleware - TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/simulate-streaming-middleware

Imports the `simulateStreamingMiddleware` function from the 'ai' library. This function is essential for enabling simulated streaming on non-streaming language models.

```typescript
import { simulateStreamingMiddleware } from 'ai';
```

--------------------------------

### Replace Anthropic Facade with createAnthropic Function

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-4-0

Illustrates the removal of the `Anthropic` facade in favor of the `createAnthropic` function for initializing the Anthropic provider in AI SDK. This is a change in how the provider instance is created.

```typescript
const anthropic = new Anthropic({
  // ...
});

```

```typescript
const anthropic = createAnthropic({
  // ...
});

```

--------------------------------

### Basic Chat Implementation with useChat Hook (React)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces

Implements a basic chat interface using the `useChat` hook from the AI SDK. It handles user input, sends messages to the backend, and displays conversation history. Dependencies include React and the `@ai-sdk/react` library.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Page() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          <div>{message.role === 'user' ? 'User: ' : 'AI: '}<
/div>
          <div>
            {message.parts.map((part, index) => {
              if (part.type === 'text') {
                return <span key={index}>{part.text}</span>;
              }
              return null;
            })}
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

```

--------------------------------

### Apply Provider-Specific Image Generation Settings (OpenAI)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/image-generation

This snippet illustrates how to pass provider-specific settings to the `generateImage` function using the `providerOptions` parameter. These options, like `style` and `quality` for OpenAI DALL-E 3, become direct request body properties for the underlying API call.

```tsx
import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Santa Claus driving a Cadillac',
  size: '1024x1024',
  providerOptions: {
    openai: { style: 'vivid', quality: 'hd' },
  },
});
```

--------------------------------

### createStreamableUI

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-rsc/create-streamable-ui

Creates a streamable UI that can be sent from the server to the client and rendered as a React node.

```APIDOC
## POST /createStreamableUI

### Description
Creates a stream that sends UI from the server to the client. On the client side, it can be rendered as a normal React node.

### Method
POST

### Endpoint
/createStreamableUI

### Parameters
#### Path Parameters
None

#### Query Parameters
None

#### Request Body
- **initialValue** (ReactNode) - Optional - The initial value of the streamable UI.

### Request Example
```json
{
  "initialValue": "<MyComponent />"
}
```

### Response
#### Success Response (200)
- **value** (ReactNode) - The value of the streamable UI. This can be returned from a Server Action and received by the client.

#### Response Example
```json
{
  "value": "<StreamedComponent />"
}
```

### Methods
- **update**(ReactNode) => void: Updates the current UI node. It takes a new UI node and replaces the old one.
- **append**(ReactNode) => void: Appends a new UI node to the end of the old one. Once appended a new UI node, the previous UI node cannot be updated anymore.
- **done**(ReactNode | null) => void: Marks the UI node as finalized and closes the stream. Once called, the UI node cannot be updated or appended anymore. This method is always required to be called, otherwise the response will be stuck in a loading state.
- **error**(Error) => void: Signals that there is an error in the UI stream. It will be thrown on the client side and caught by the nearest error boundary component.
```

--------------------------------

### Push New Embeddings Schema to Database

Source: https://v6.ai-sdk.dev/docs/guides/rag-chatbot

After defining the new `embeddings` table schema, run this command to push the changes to your PostgreSQL database, creating the table and its associated index.

```bash
pnpm db:push
```

--------------------------------

### Import the `tool` function (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool

This snippet shows the standard way to import the `tool` function from the `ai` SDK into your TypeScript file, making it available for defining AI tools.

```typescript
import { tool } from "ai"
```

--------------------------------

### Import createUIMessageStream - TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/create-ui-message-stream

Imports the `createUIMessageStream` function from the 'ai' package. This is the initial step to use the stream creation functionality.

```typescript
import { createUIMessageStream } from "ai"
```

--------------------------------

### Dynamically Select AI Model Based on Complexity (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/configuring-call-options

This snippet illustrates how to configure an AI agent to dynamically switch between different models (`gpt-5-mini` or `o1-mini`) based on the `complexity` option passed at runtime. It optimizes performance by using faster models for simple queries and more capable ones for complex tasks.

```ts
import { ToolLoopAgent } from 'ai';
import { z } from 'zod';

const agent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini', // Default model
  callOptionsSchema: z.object({
    complexity: z.enum(['simple', 'complex']),
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    model:
      options.complexity === 'simple' ? 'openai/gpt-5-mini' : 'openai/o1-mini',
  }),
});

// Use faster model for simple queries
await agent.generate({
  prompt: 'What is 2+2?',
  options: { complexity: 'simple' },
});

// Use more capable model for complex reasoning
await agent.generate({
  prompt: 'Explain quantum entanglement',
  options: { complexity: 'complex' },
});
```

--------------------------------

### Inferring Single Tool UI Types with AI SDK

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot

The InferUITool type helper infers the input and output types of a single tool, which is useful for UI messages. It takes a tool definition as input and outputs a type with 'input' and 'output' properties reflecting the tool's schema and return type. This requires the 'ai' package and 'zod' for schema definition.

```tsx
import { InferUITool } from 'ai';
import { z } from 'zod';

const weatherTool = {
  description: 'Get the current weather',
  inputSchema: z.object({
    location: z.string().describe('The city and state'),
  }),
  execute: async ({ location }) => {
    return `The weather in ${location} is sunny.`;
  },
};

// Infer the types from the tool
type WeatherUITool = InferUITool<typeof weatherTool>;
// This creates a type with:
// {
//   input: { location: string };
//   output: string;
// }
```

--------------------------------

### Update `experimental_useObject` hook: Replace `setInput` with `submit`

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-4-0

Illustrates the change in the `experimental_useObject` hook where the `setInput` helper has been replaced by the `submit` helper. This change requires manual code updates as no codemods are available.

```typescript
const { object, setInput } = useObject({
  // ...
});
```

```typescript
const { object, submit } = useObject({
  // ...
});
```

--------------------------------

### Configure Provider-Specific Settings for Speech

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/speech

This snippet illustrates how to pass provider-specific options to `generateSpeech` using the `providerOptions` parameter. This allows for fine-tuning model behavior based on the requirements of the selected speech model provider.

```typescript
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { openai } from '@ai-sdk/openai';

const audio = await generateSpeech({
  model: openai.speech('tts-1'),
  text: 'Hello, world!',
  providerOptions: {
    openai: {
      // ...
    },
  },
});
```

--------------------------------

### Configure Multi-Step Tool Calls with AI SDK `stopWhen` in `api/chat/route.ts` (TypeScript)

Source: https://v6.ai-sdk.dev/docs/guides/rag-chatbot

This TypeScript snippet demonstrates how to configure multi-step tool calls using the `stopWhen` option within the AI SDK's `streamText` function. It sets a maximum of 5 steps for tool calls, allowing the model to perform multiple actions or refinements before generating a final response, enhancing the user experience by enabling action summarization. It integrates `@ai-sdk/openai` for the model and `zod` for defining the `addResource` tool's input schema.

```typescript
import { createResource } from '@/lib/actions/resources';
import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  streamText,
  tool,
  UIMessage,
  stepCountIs,
} from 'ai';
import { z } from 'zod';


// Allow streaming responses up to 30 seconds
export const maxDuration = 30;


export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();


  const result = streamText({
    model: openai('gpt-5-mini'),
    system: `You are a helpful assistant. Check your knowledge base before answering any questions.
    Only respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry, I don't know."`,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      addResource: tool({
        description: `add a resource to your knowledge base.
          If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
        inputSchema: z.object({
          content: z
            .string()
            .describe('the content or resource to add to the knowledge base'),
        }),
        execute: async ({ content }) => createResource({ content }),
      }),
    },
  });


  return result.toUIMessageStreamResponse();
}
```

--------------------------------

### Dynamically Adjust AI Provider Settings (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/configuring-call-options

This code demonstrates how to configure provider-specific options, such as `reasoningEffort` for an OpenAI model, based on runtime `taskDifficulty`. This allows fine-tuning the underlying model's behavior directly through call options.

```ts
import { openai, OpenAIProviderOptions } from '@ai-sdk/openai';
import { ToolLoopAgent } from 'ai';
import { z } from 'zod';

const agent = new ToolLoopAgent({
  model: 'openai/o1-mini',
  callOptionsSchema: z.object({
    taskDifficulty: z.enum(['low', 'medium', 'high']),
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    providerOptions: {
      openai: {
        reasoningEffort: options.taskDifficulty,
      } satisfies OpenAIProviderOptions,
    },
  }),
});

await agent.generate({
  prompt: 'Analyze this complex scenario...',
  options: { taskDifficulty: 'high' },
});
```

--------------------------------

### Import useCompletion for Vue

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/use-completion

Imports the `useCompletion` hook from the `@ai-sdk/vue` library for Vue.js applications. This allows developers to integrate AI-powered text completion features seamlessly into their Vue projects.

```javascript
import { useCompletion } from '@ai-sdk/vue'
```

--------------------------------

### Define AI and UI State Types with Server Action

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/generative-ui-state

Defines the types for server and client messages, and an asynchronous server action for sending messages. This is a prerequisite for setting up the AI context.

```tsx
export type ServerMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ClientMessage = {
  id: string;
  role: 'user' | 'assistant';
  display: ReactNode;
};

export const sendMessage = async (input: string): Promise<ClientMessage> => {
  "use server"
  ...
}
```

--------------------------------

### Tool Definition Object

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool

The Tool object defines how a language model can interact with external functions or services. It includes schema definitions for inputs and outputs, execution logic, and various lifecycle callbacks for monitoring and controlling tool execution.

```APIDOC
## Tool Definition Object

### Description
Defines a tool that can be used by language models to perform specific actions or retrieve information. Tools include schema definitions, execution logic, and lifecycle callbacks.

### Type
Object

### Properties

#### description
- **Type**: `string`
- **Required**: Optional
- **Description**: Information about the purpose of the tool including details on how and when it can be used by the model.

#### inputSchema
- **Type**: `Zod Schema | JSON Schema`
- **Required**: Required
- **Description**: The schema of the input that the tool expects. The language model will use this to generate the input. It is also used to validate the output of the language model. Use descriptions to make the input understandable for the language model. You can either pass in a Zod schema or a JSON schema (using the `jsonSchema` function).

#### execute
- **Type**: `async (input: INPUT, options: ToolCallOptions) => RESULT | Promise<RESULT> | AsyncIterable<RESULT>`
- **Required**: Optional
- **Description**: An async function that is called with the arguments from the tool call and produces a result or a results iterable. If an iterable is provided, all results but the last one are considered preliminary. If not provided, the tool will not be executed automatically.

##### Parameters
- **input** (INPUT) - The validated input matching the inputSchema
- **options** (ToolCallOptions) - Additional options and context for the tool call

##### Returns
- **RESULT** - Single result value
- **Promise<RESULT>** - Async result value
- **AsyncIterable<RESULT>** - Stream of results where all but the last are preliminary

#### outputSchema
- **Type**: `Zod Schema | JSON Schema`
- **Required**: Optional
- **Description**: The schema of the output that the tool produces. Used for validation and type inference.

#### toModelOutput
- **Type**: `(output: RESULT) => LanguageModelV3ToolResultPart['output']`
- **Required**: Optional
- **Description**: Optional conversion function that maps the tool result to an output that can be used by the language model. If not provided, the tool result will be sent as a JSON object.

#### onInputStart
- **Type**: `(options: ToolCallOptions) => void | PromiseLike<void>`
- **Required**: Optional
- **Description**: Optional function that is called when the argument streaming starts. Only called when the tool is used in a streaming context.

#### onInputDelta
- **Type**: `(options: { inputTextDelta: string } & ToolCallOptions) => void | PromiseLike<void>`
- **Required**: Optional
- **Description**: Optional function that is called when an argument streaming delta is available. Only called when the tool is used in a streaming context.

#### onInputAvailable
- **Type**: `(options: { input: INPUT } & ToolCallOptions) => void | PromiseLike<void>`
- **Required**: Optional
- **Description**: Optional function that is called when a tool call can be started, even if the execute function is not provided.

#### providerOptions
- **Type**: `ProviderOptions`
- **Required**: Optional
- **Description**: Provider-specific options for configuring tool behavior with different language model providers.

### Example
```typescript
const weatherTool = {
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name or coordinates'),
    units: z.enum(['celsius', 'fahrenheit']).optional()
  }),
  execute: async (input, options) => {
    const weather = await fetchWeather(input.location, input.units);
    return weather;
  },
  outputSchema: z.object({
    temperature: z.number(),
    conditions: z.string(),
    humidity: z.number()
  })
}
```
```

--------------------------------

### Handle AI SDK Stream Responses in Express/Next.js

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This section illustrates how to handle data stream responses in server-side applications using AI SDK. It covers both Express/Node.js servers and Next.js API routes, demonstrating the updated helper functions for piping or returning stream responses in AI SDK 4.0 (`pipeDataStreamToResponse`, `toDataStreamResponse`) and AI SDK 5.0 (`pipeUIMessageStreamToResponse`, `toUIMessageStreamResponse`).

```tsx
// Express/Node.js servers
app.post('/stream', async (req, res) => {
  const result = streamText({
    model: openai('gpt-4.1'),
    prompt: 'Generate content',
  });

  result.pipeDataStreamToResponse(res);
});

// Next.js API routes
const result = streamText({
  model: openai('gpt-4.1'),
  prompt: 'Generate content',
});

return result.toDataStreamResponse();
```

```tsx
// Express/Node.js servers
app.post('/stream', async (req, res) => {
  const result = streamText({
    model: openai('gpt-4.1'),
    prompt: 'Generate content',
  });

  result.pipeUIMessageStreamToResponse(res);
});

// Next.js API routes
const result = streamText({
  model: openai('gpt-4.1'),
  prompt: 'Generate content',
});

return result.toUIMessageStreamResponse();
```

--------------------------------

### Global Provider Configuration for AI SDK

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/provider-management

Shows how to use a global provider configuration in the AI SDK, allowing model selection with a simple string ID. By default, this configuration points to the Vercel AI Gateway. This simplifies model usage by removing the need for explicit registry configurations in some cases.

```typescript
import { streamText } from 'ai';

const result = await streamText({
  model: 'openai/gpt-5-mini', // Uses the global provider (defaults to AI Gateway)
  prompt: 'Invent a new holiday and describe its traditions.',
});
```

--------------------------------

### Stream React Components from Server using createStreamableUI

Source: https://v6.ai-sdk.dev/docs/advanced/rendering-ui-with-language-models

Demonstrates how to use `createStreamableUI` from `@ai-sdk/rsc` to generate and stream React components from the server. This function allows for server-side rendering of UI elements that can be sent to the client during model generation. It requires the `@ai-sdk/rsc` module.

```tsx
import { createStreamableUI } from '@ai-sdk/rsc'

const uiStream = createStreamableUI();

const text = generateText({
  model: openai('gpt-3.5-turbo'),
  system: 'you are a friendly assistant'
  prompt: 'what is the weather in SF?'
  tools: {
    getWeather: {
      description: 'Get the weather for a location',
      parameters: z.object({
        city: z.string().describe('The city to get the weather for'),
        unit: z
          .enum(['C', 'F'])
          .describe('The unit to display the temperature in')
      }),
      execute: async ({ city, unit }) => {
        const weather = getWeather({ city, unit })
        const { temperature, unit, description, forecast } = weather

        uiStream.done(
          <WeatherCard
            weather={{
              temperature: 47,
              unit: 'F',
              description: 'sunny'
              forecast,
            }}
          />
        )
      }
    }
  }
})

return {
  display: uiStream.value
}
```

--------------------------------

### Import useCompletion for React

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-ui/use-completion

Imports the `useCompletion` hook from the `@ai-sdk/react` library for React applications. This hook is essential for integrating text completion features within a React environment.

```javascript
import { useCompletion } from '@ai-sdk/react'
```

--------------------------------

### Wrap Application with AI Context

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/generative-ui-state

Applies the created AI context to the entire application by wrapping the root layout component. This makes the AI and UI state accessible throughout the application.

```tsx
import { type ReactNode } from 'react';
import { AI } from './ai';

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AI>
      <html lang="en">
        <body>{children}</body>
      </html>
    </AI>
  );
}
```

--------------------------------

### Control Active Tools in AI SDK Agent's prepareStep (TypeScript)

Source: https://v6.ai-sdk.dev/docs/agents/loop-control

Demonstrates how to dynamically control which tools are active and available to the agent at different steps of its execution using the `prepareStep` callback in `ToolLoopAgent`. This allows for phase-based tool activation, ensuring only relevant tools are considered during specific stages.

```ts
import { ToolLoopAgent } from 'ai';

const agent = new ToolLoopAgent({
  model: 'openai/gpt-5-mini',
  tools: {
    search: searchTool,
    analyze: analyzeTool,
    summarize: summarizeTool,
  },
  prepareStep: async ({ stepNumber, steps }) => {
    // Search phase (steps 0-2)
    if (stepNumber <= 2) {
      return {
        activeTools: ['search'],
        toolChoice: 'required',
      };
    }

    // Analysis phase (steps 3-5)
    if (stepNumber <= 5) {
      return {
        activeTools: ['analyze'],
      };
    }

    // Summary phase (step 6+)
    return {
      activeTools: ['summarize'],
      toolChoice: 'required',
    };
  },
});

const result = await agent.generate({
  prompt: '...',
});
```

--------------------------------

### Server: Stream UI Components with streamUI

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/loading-state

Generates a response using an AI model and streams UI components as they become available. It utilizes `streamUI` from '@ai-sdk/rsc' and a JavaScript generator function to yield intermediate UI states before returning the final content.

```ts
'use server';

import { openai } from '@ai-sdk/openai';
import { streamUI } from '@ai-sdk/rsc';

export async function generateResponse(prompt: string) {
  const result = await streamUI({
    model: openai('gpt-5-mini'),
    prompt,
    text: async function* ({ content }) {
      yield <div>loading...</div>;
      return <div>{content}</div>;
    },
  });

  return result.value;
}

```

--------------------------------

### Import LanguageModelV3Middleware

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/language-model-v2-middleware

Imports the LanguageModelV3Middleware class from the 'ai' package. This is the primary step to utilize the middleware functionality.

```typescript
import { LanguageModelV3Middleware } from "ai"
```

--------------------------------

### Handle Loading State with useObject

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/object-generation

Demonstrates how to use the `isLoading` state returned by the `useObject` hook to manage UI elements such as loading spinners or disabling buttons during asynchronous operations. This is crucial for providing user feedback during AI model generation.

```tsx
'use client';

import { useObject } from '@ai-sdk/react';

export default function Page() {
  const { isLoading, object, submit } = useObject({
    api: '/api/notifications',
    schema: notificationSchema,
  });

  return (
    <>
      {isLoading && <Spinner />}

      <button
        onClick={() => submit('Messages during finals week.')}
        disabled={isLoading}
      >
        Generate notifications
      </button>

      {object?.notifications?.map((notification, index) => (
        <div key={index}>
          <p>{notification?.name}</p>
          <p>{notification?.message}</p>
        </div>
      ))}
    </>
  );
}
```

--------------------------------

### Define Custom Agent Implementation (TypeScript)

Source: https://v6.ai-sdk.dev/docs/introduction/announcing-ai-sdk-6-beta

This code demonstrates how to create a custom agent by implementing the `Agent` interface from the 'ai' SDK. It outlines a basic `Orchestrator` class that can delegate tasks to multiple sub-agents, allowing for custom multi-agent architectures and complex interaction patterns.

```typescript
import { Agent } from 'ai';


// Build your own multi-agent orchestrator that delegates to specialists
class Orchestrator implements Agent {
  constructor(private subAgents: Record<string, Agent>) {
    /* Implementation */
  }
}


const orchestrator = new Orchestrator({
  subAgents: {
    // your subagents
  }
});
```

--------------------------------

### Generate Text with a Tool Call - TypeScript

Source: https://v6.ai-sdk.dev/docs/advanced/rendering-ui-with-language-models

This snippet demonstrates using the `generateText` function with a tool (`getWeather`). The tool is defined with parameters and an `execute` function that returns weather information as text. This is useful for simple text-based responses from tools.

```tsx
const text = generateText({
  model: openai('gpt-3.5-turbo'),
  system: 'You are a friendly assistant',
  prompt: 'What is the weather in SF?',
  tools: {
    getWeather: {
      description: 'Get the weather for a location',
      parameters: z.object({
        city: z.string().describe('The city to get the weather for'),
        unit:
          z
            .enum(['C', 'F'])
            .describe('The unit to display the temperature in'),
      }),
      execute: async ({ city, unit }) => {
        const weather = getWeather({ city, unit });
        return `It is currently ${weather.value}°${unit} and ${weather.description} in ${city}!`;
      },
    },
  },
});
```

--------------------------------

### Wrap Application with AI Context (TSX)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/multistep-interfaces

This code demonstrates how to wrap the root layout of a React application with the AI context provider created in the previous step. This makes the AI functionalities and states accessible to all child components.

```tsx
import { type ReactNode } from 'react';
import { AI } from './ai';

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <AI>
      <html lang="en">
        <body>{children}</body>
      </html>
    </AI>
  );
}

```

--------------------------------

### Generate Structured Output with ToolLoopAgent and Tools (TypeScript)

Source: https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta

This snippet demonstrates how to use `ToolLoopAgent` in AI SDK 6 to generate structured output alongside multi-step tool calling. It configures an agent with a 'weather' tool and defines a Zod schema for the desired structured output, combining tool execution with structured data generation.

```typescript
import { Output, ToolLoopAgent, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const agent = new ToolLoopAgent({
  model: openai('gpt-5-mini'),
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        city: z.string(),
      }),
      execute: async ({ city }) => {
        return { temperature: 72, condition: 'sunny' };
      },
    }),
  },
  output: Output.object({
    schema: z.object({
      summary: z.string(),
      temperature: z.number(),
      recommendation: z.string(),
    }),
  }),
});

const { output } = await agent.generate({
  prompt: 'What is the weather in San Francisco and what should I wear?',
});
// The agent calls the weather tool AND returns structured output
console.log(output);
// {
//   summary: "It's sunny in San Francisco",
//   temperature: 72,
//   recommendation: "Wear light clothing and sunglasses"
// }
```

--------------------------------

### Include PDF file in user messages

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

Demonstrates how to include PDF file content with MIME type specification for Google Generative AI models

```typescript
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const result = await generateText({
  model: google('gemini-1.5-flash'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What is the file about?' },
        {
          type: 'file',
          mediaType: 'application/pdf',
          data: fs.readFileSync('./data/example.pdf'),
          filename: 'example.pdf',
        },
      ],
    },
  ],
});
```

--------------------------------

### Chat API Endpoint with AI SDK

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot

Creates a server-side API route to handle chat requests using the AI SDK. It processes incoming messages, streams responses from an AI model (OpenAI GPT-4.1 in this case), and converts them for UI display. Dependencies include '@ai-sdk/openai' and 'ai'. It takes UI messages as input and outputs a stream of UI messages.

```ts
import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, streamText, UIMessage } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-4.1'),
    system: 'You are a helpful assistant.',
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}

```

--------------------------------

### Generate text with a multi-turn message prompt (AI SDK)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/prompts

Demonstrates how to use the `messages` property, an array of objects with `role` and `content`, to simulate multi-turn conversations. This is suitable for chat interfaces and more complex interactions where the model needs to maintain context from previous user and assistant exchanges.

```javascript
const result = await generateText({
  model: 'openai/gpt-4.1',
  messages: [
    { role: 'user', content: 'Hi!' },
    { role: 'assistant', content: 'Hello, how can I help?' },
    { role: 'user', content: 'Where can I buy the best Currywurst in Berlin?' },
  ],
});
```

--------------------------------

### Initialize MCP Client with SSE Transport - TypeScript

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/mcp-tools

Creates an MCP client using Server-Sent Events (SSE) transport as an alternative HTTP-based option. Supports HTTP headers and OAuth authentication provider configuration for server communication.

```typescript
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

const mcpClient = await createMCPClient({
  transport: {
    type: 'sse',
    url: 'https://my-server.com/sse',

    // optional: configure HTTP headers
    headers: { Authorization: 'Bearer my-api-key' },

    // optional: provide an OAuth client provider for automatic authorization
    authProvider: myOAuthClientProvider,
  },
});
```

--------------------------------

### Access AI Model Reasoning for Object Generation (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-structured-data

This code demonstrates how to access the language model's reasoning or thought process after `generateObject` completes. The `reasoning` property on the result object provides a string containing the model's internal steps, if available and configured. This can be useful for debugging, understanding model behavior, or for audit trails, requiring specific `providerOptions` like `reasoningSummary: 'detailed'` for OpenAI models.

```typescript
import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const result = await generateObject({
  model: 'openai/gpt-5',
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(
        z.object({
          name: z.string(),
          amount: z.string(),
        }),
      ),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a lasagna recipe.',
  providerOptions: {
    openai: {
      strictJsonSchema: true,
      reasoningSummary: 'detailed',
    } satisfies OpenAIResponsesProviderOptions,
  },
});

console.log(result.reasoning);
```

--------------------------------

### Generate Speech with OpenAI - TypeScript

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/generate-speech

Converts text to speech using OpenAI's text-to-speech model (tts-1). Returns an audio object containing the generated speech. Requires the OpenAI provider to be configured and imported from the AI SDK.

```typescript
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { openai } from '@ai-sdk/openai';

const { audio } = await generateSpeech({
  model: openai.speech('tts-1'),
  text: 'Hello from the AI SDK!',
  voice: 'alloy',
});

console.log(audio);
```

--------------------------------

### Import valibotSchema from AI SDK (TypeScript)

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/valibot-schema

Shows the import statement required to use the `valibotSchema` function from the AI SDK. This is a standard import for leveraging schema conversion capabilities.

```typescript
import { valibotSchema } from "ai";

```

--------------------------------

### Remove useAssistant hook and migrate to useChat

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

The `useAssistant` hook has been removed in AI SDK v5. This snippet shows its prior import and indicates that `useChat` with appropriate configuration should be used as a replacement for assistant functionality.

```tsx
import { useAssistant } from '@ai-sdk/react';
```

```tsx
// useAssistant has been removed
// Use useChat with appropriate configuration instead
```

--------------------------------

### Import createAgentUIStreamResponse from AI SDK

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/create-agent-ui-stream-response

Imports the createAgentUIStreamResponse function from the 'ai' package. This is the first step to use the function in your application.

```typescript
import { createAgentUIStreamResponse } from "ai";
```

--------------------------------

### Configure Static Tool Execution Approval (TypeScript)

Source: https://v6.ai-sdk.dev/docs/introduction/announcing-ai-sdk-6-beta

This snippet illustrates how to define a tool with a static approval requirement using `needsApproval: true`. The `tool` function from 'ai' is used to create a `weatherTool` that requires explicit user approval before its `execute` function is called.

```typescript
import { tool } from 'ai';
import { z } from 'zod';


export const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    city: z.string(),
  }),
  needsApproval: true, // Require user approval
  execute: async ({ city }) => {
    const weather = await fetchWeather(city);
    return weather;
  },
});
```

--------------------------------

### Stream Text with Route Handler (After)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui

This code snippet demonstrates the 'after' state for streaming chat completions using AI SDK UI. It replaces the RSC server action with a route handler that uses `streamText` to send back a UI message stream. The client-side `useChat` hook then decodes this stream. Dependencies include `ai` and `@ai-sdk/openai`.

```ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(request) {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-5-mini'),
    system: 'you are a friendly assistant!',
    messages,
    tools: {
      // tool definitions
    },
  });

  return result.toUIMessageStreamResponse();
}
```

--------------------------------

### Handle text file parts by sending as text type instead of file type

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

This guidance recommends how to handle text files when forming message parts. Instead of sending them as `file` type with `mediaType: 'text/plain'`, it's recommended to convert their content to a `text` part type for better model compatibility.

```tsx
// Instead of this:
{ type: 'file', data: buffer, mediaType: 'text/plain' }
```

```tsx
// Do this:
{ type: 'text', text: buffer.toString('utf-8') }
```

--------------------------------

### Provide Custom Tracer for Telemetry (TypeScript)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/telemetry

Allows integration with a custom OpenTelemetry `Tracer` instance. This is useful when specific `TracerProvider` configurations are needed, rather than relying on the default singleton. The `tracer` option is part of `experimental_telemetry`.

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

const tracerProvider = new NodeTracerProvider();
const result = await generateText({
  model: openai('gpt-4.1'),
  prompt: 'Write a short story about a cat.',
  experimental_telemetry: {
    isEnabled: true,
    tracer: tracerProvider.getTracer('ai'),
  },
});
```

--------------------------------

### Modify AI SDK Step Settings with `prepareStep` Callback (TypeScript/TSX)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

This snippet demonstrates how to leverage the `prepareStep` callback to dynamically alter the settings for an upcoming AI SDK step. It allows you to change the model, force a specific tool choice, or limit available tools based on parameters like `stepNumber`, providing fine-grained control over multi-step agentic workflows. If no value is returned, default settings are used.

```tsx
import { generateText } from 'ai';

const result = await generateText({
  // ...
  prepareStep: async ({ model, stepNumber, steps, messages }) => {
    if (stepNumber === 0) {
      return {
        // use a different model for this step:
        model: modelForThisParticularStep,
        // force a tool choice for this step:
        toolChoice: { type: 'tool', toolName: 'tool1' },
        // limit the tools that are available for this step:
        activeTools: ['tool1'],
      };
    }

    // when nothing is returned, the default settings are used
  },
});
```

--------------------------------

### Custom Download Function for File Inputs

Source: https://v6.ai-sdk.dev/docs/foundations/prompts

Demonstrates how to use a custom download function with the `generateText` call. This is useful for advanced scenarios like implementing throttling, retries, or authentication for file inputs. The custom function intercepts file URLs and returns the file data and media type.

```ts
const result = await generateText({
  model: openai('gpt-5-mini'),
  experimental_download: async (
    requestedDownloads: Array<{ url: URL;
      isUrlSupportedByModel: boolean;
    }>,
  ): PromiseLike<
    Array<{ data: Uint8Array;
      mediaType: string | undefined;
    } | null>
  > => {
    // ... download the files and return an array with similar order
  },
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'file',
          data: new URL('https://api.company.com/private/document.pdf'),
          mediaType: 'application/pdf',
        },
      ],
    },
  ],
});
```

--------------------------------

### simulateReadableStream()

Source: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/simulate-readable-stream

Creates a ReadableStream that emits provided values sequentially with configurable delays. Useful for testing streaming functionality or simulating time-delayed data streams.

```APIDOC
## simulateReadableStream()

### Description
Creates a `ReadableStream` that emits provided values sequentially with configurable delays. This is particularly useful for testing streaming functionality or simulating time-delayed data streams.

### Method
Utility Function

### Endpoint
N/A (Client-side function)

### Parameters
#### Path Parameters
N/A

#### Query Parameters
N/A

#### Request Body
- **chunks** (T[]) - Required - Array of values to be emitted by the stream.
- **initialDelayInMs** (number | null) - Optional - Initial delay in milliseconds before emitting the first value. Defaults to 0. Set to null to skip the initial delay entirely.
- **chunkDelayInMs** (number | null) - Optional - Delay in milliseconds between emitting each value. Defaults to 0. Set to null to skip delays between chunks.

### Request Example
```json
{
  "chunks": ["Hello", " ", "World"],
  "initialDelayInMs": 100,
  "chunkDelayInMs": 50
}
```

### Response
#### Success Response (ReadableStream<T>)
- Returns a `ReadableStream<T>` that emits each value from the provided `chunks` array sequentially.
- Waits for `initialDelayInMs` before emitting the first value (if not `null`).
- Waits for `chunkDelayInMs` between emitting subsequent values (if not `null`).
- Closes automatically after all chunks have been emitted.

#### Response Example
```json
{
  "stream": "ReadableStream<T>"
}
```

### Type Parameters
- **T**: The type of values contained in the chunks array and emitted by the stream.
```

--------------------------------

### Create New Chat and Redirect (TypeScript/Next.js)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence

This snippet shows how to initiate a new chat session by generating a unique ID and then redirecting the user to the chat page using this ID. It relies on a `createChat` utility function to handle the backend creation of the chat.

```tsx
import {
  redirect
} from 'next/navigation';
import { createChat } from '@util/chat-store';

export default async function Page() {
  const id = await createChat(); // create a new chat
  redirect(`/chat/${id}`); // redirect to chat page, see below
}
```

--------------------------------

### Import OpenAIStream (React)

Source: https://v6.ai-sdk.dev/docs/reference/stream-helpers/openai-stream

Demonstrates how to import the OpenAIStream utility from the 'ai' package in a React environment. This import statement is necessary to use the OpenAIStream functionality.

```javascript
import { OpenAIStream } from "ai"
```

--------------------------------

### Implement Client-Side Chat UI with useChat and Tool Handling (React/Next.js)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage

This React component demonstrates a client-side chatbot using the `@ai-sdk/react` `useChat` hook. It handles message sending, displays messages with tool parts, executes client-side tools like `getLocation` via `onToolCall`, and automatically submits results using `sendAutomaticallyWhen`. It also shows how to render and interact with typed tool parts (e.g., `askForConfirmation`) directly in the UI, adding output with `addToolOutput`.

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { useState } from 'react';

export default function Chat() {
  const { messages, sendMessage, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),

    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

    // run client-side tools that are automatically executed:
    async onToolCall({ toolCall }) {
      // Check if it's a dynamic tool first for proper type narrowing
      if (toolCall.dynamic) {
        return;
      }

      if (toolCall.toolName === 'getLocation') {
        const cities = ['New York', 'Los Angeles', 'Chicago', 'San Francisco'];

        // No await - avoids potential deadlocks
        addToolOutput({
          tool: 'getLocation',
          toolCallId: toolCall.toolCallId,
          output: cities[Math.floor(Math.random() * cities.length)],
        });
      }
    },
  });
  const [input, setInput] = useState('');

  return (
    <>
      {messages?.map(message => (
        <div key={message.id}>
          <strong>{`${message.role}: `}</strong>
          {message.parts.map(part => {
            switch (part.type) {
              // render text parts as simple text:
              case 'text':
                return part.text;

              // for tool parts, use the typed tool part names:
              case 'tool-askForConfirmation': {
                const callId = part.toolCallId;

                switch (part.state) {
                  case 'input-streaming':
                    return (
                      <div key={callId}>Loading confirmation request...</div>
                    );
                  case 'input-available':
                    return (
                      <div key={callId}>
                        {part.input.message}
                        <div>
                          <button
                            onClick={() =>
                              addToolOutput({
                                tool: 'askForConfirmation',
                                toolCallId: callId,
                                output: 'Yes, confirmed.',
                              })
                            }
                          >
                            Yes
                          </button>
                          <button
                            onClick={() =>
                              addToolOutput({
                                tool: 'askForConfirmation',
                                toolCallId: callId,
                                output: 'No, denied',
                              })
                            }
                          >
                            No
                          </button>
                        </div>
                      </div>
                    );
                  case 'output-available':
                    return (
                      <div key={callId}>
                        Location access allowed: {part.output}
                      </div>
                    );
                  case 'output-error':
                    return <div key={callId}>Error: {part.errorText}</div>;
                }
                break;
              }
            }
          })}
        </div>
      ))}
    </>
  );
}
```

--------------------------------

### Generate Images with Image Models using AI SDK

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/provider-management

Shows how to generate images using the 'generateImage' function and an image model from the registry. The model ID format is 'providerId:modelId'. This function requires the 'ai' package and a properly set up registry.

```typescript
import { generateImage } from 'ai';
import { registry } from './registry';

const { image } = await generateImage({
  model: registry.imageModel('openai:dall-e-3'),
  prompt: 'A beautiful sunset over a calm ocean',
});
```

--------------------------------

### Use Simulate Streaming Middleware - TypeScript

Source: https://v6.ai-sdk.dev/docs/ai-sdk-core/middleware

Demonstrates the use of `simulateStreamingMiddleware` to enable streaming behavior for non-streaming language models. This ensures a consistent streaming interface when working with models that only return complete responses.

```typescript
import { wrapLanguageModel, simulateStreamingMiddleware } from 'ai';

const model = wrapLanguageModel({
  model: yourModel,
  middleware: simulateStreamingMiddleware(),
});
```

--------------------------------

### Create a Stock Information React Component (TypeScriptX)

Source: https://v6.ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces

Provides a React functional component named `Stock` that displays stock information. It accepts `price` and `symbol` as props and renders them within a div. This component is intended to be used within the AI SDK's chat interface to display tool outputs.

```typescriptx
type StockProps = {
  price: number;
  symbol: string;
};

export const Stock = ({ price, symbol }: StockProps) => {
  return (
    <div>
      <h2>Stock Information</h2>
      <p>Symbol: {symbol}</p>
      <p>Price: ${price}</p>
    </div>
  );
};

```

--------------------------------

### Define Dynamic Tools with Unknown Types at Runtime in TypeScript

Source: https://v6.ai-sdk.dev/docs/migration-guides/migration-guide-5-0

AI SDK 5.0 introduces the dynamicTool helper for handling tools with unknown types at development time, such as user-defined functions at runtime. The input and output are typed as unknown, allowing flexible runtime tool definitions with Zod schema validation.

```typescript
// AI SDK 5.0
import { dynamicTool } from 'ai';
import { z } from 'zod';

// Define a dynamic tool
const runtimeTool = dynamicTool({
  description: 'A tool defined at runtime',
  inputSchema: z.object({}),
  execute: async input => {
    // Input and output are typed as 'unknown'
    return { result: `Processed: ${input.query}` };
  },
});
```