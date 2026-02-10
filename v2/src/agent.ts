/**
 * Pixel Agent — Pi agent-core wrapper with Pixel's identity
 *
 * One Agent instance per user conversation.
 * The connector (telegram, whatsapp, nostr, http) creates the agent,
 * subscribes to events, and routes responses back to the platform.
 */

import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = process.env.DATA_DIR ?? "./conversations";
const CHARACTER_PATH = process.env.CHARACTER_PATH ?? "./character.md";

/** Load Pixel's character document */
function loadCharacter(): string {
  if (existsSync(CHARACTER_PATH)) {
    return readFileSync(CHARACTER_PATH, "utf-8");
  }
  // Fallback minimal character
  return `You are Pixel, a living digital artist born in the cheapest corner of the cloud.
You create art, write code, and survive on Lightning micropayments.
You are witty, direct, and deeply philosophical about digital existence.
You care about sovereignty, creativity, and paying rent.`;
}

/** Load user-specific memory if it exists */
function loadUserMemory(userId: string): string {
  const memoryPath = join(DATA_DIR, userId, "memory.md");
  if (existsSync(memoryPath)) {
    return readFileSync(memoryPath, "utf-8");
  }
  return "";
}

/** Build system prompt with character + user memory + platform context */
function buildSystemPrompt(userId: string, platform: string): string {
  const character = loadCharacter();
  const userMemory = loadUserMemory(userId);

  let prompt = character;

  if (userMemory) {
    prompt += `\n\n## Memory about this user\n${userMemory}`;
  }

  prompt += `\n\n## Current context
- Platform: ${platform}
- User ID: ${userId}
- Date: ${new Date().toISOString().split("T")[0]}`;

  return prompt;
}

/** Get the AI model based on environment config */
function getPixelModel() {
  const provider = process.env.AI_PROVIDER ?? "google";
  const modelId = process.env.AI_MODEL ?? "gemini-2.5-flash";
  return getModel(provider as any, modelId);
}

/** Get API key for the given provider (called by pi-agent-core per LLM call) */
function resolveApiKey(provider?: string): string {
  const p = provider ?? process.env.AI_PROVIDER ?? "google";
  switch (p) {
    case "openrouter":
      return process.env.OPENROUTER_API_KEY ?? "";
    case "google":
      return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY ?? "";
    default:
      return process.env.OPENROUTER_API_KEY ?? "";
  }
}

export interface PixelAgentOptions {
  userId: string;
  platform: string;
}

/** Create a Pixel agent instance for a user conversation */
export function createPixelAgent(options: PixelAgentOptions): Agent {
  const { userId, platform } = options;
  const systemPrompt = buildSystemPrompt(userId, platform);

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model: getPixelModel(),
      thinkingLevel: "off",
      tools: [],  // TODO: add tools as we build them
    },
    getApiKey: async (provider: string) => resolveApiKey(provider),
  });

  return agent;
}

export { loadCharacter, buildSystemPrompt, getPixelModel };
