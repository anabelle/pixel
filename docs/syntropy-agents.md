# Syntropy Agent Rules

## Core Directives
1. **Use AI SDK 6**: All Syntropy agents must use Vercel AI SDK 6.0+ features.
2. **Consult Documentation**: Always refer to `/home/pixel/pixel/docs/AI_SDK_6_DOCS.md` before implementing or modifying agent loops.
3. **ToolLoopAgent**: Prefer the `ToolLoopAgent` class for autonomous recursive cycles.
4. **Model Selection**: 
   - Default: `google/gemini-3-flash-preview` (via OpenRouter) for high-context tasks.
   - Fallback: `openai/gpt-5-mini` for structured logical reasoning.
5. **Tool Schemas**: Use `inputSchema` (Zod) for all tools. Ensure descriptions are clear to guide the model.
6. **Timeouts**: When executing shell commands via agents, always use reasonable timeouts (e.g., 30s-60s for builds, 5s-10s for status checks).

## Operational Guideline: Reasonable Timeouts
- All bash commands should include a `timeout` parameter that is appropriate for the task.
- Build commands: `timeout: 120000` (2 mins).
- Status/Read commands: `timeout: 10000` (10s).
- Avoid the default 2-minute timeout for simple operations.
