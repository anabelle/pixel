# OpenCode - AI Coding Agent for the Terminal

OpenCode is an open-source AI coding agent designed specifically for terminal-based development workflows. It provides a powerful TUI (Terminal User Interface) that enables developers to interact with multiple AI models including Anthropic Claude, OpenAI GPT, Google Gemini, and local models for coding assistance, code generation, refactoring, and debugging tasks. The platform emphasizes flexibility and extensibility through its plugin system, custom agent configurations, and comprehensive tool ecosystem.

Built on a client/server architecture, OpenCode separates the execution engine from the interface layer, enabling unique use cases like running the server on a development machine while controlling it remotely from mobile devices or other clients. The project includes built-in Language Server Protocol (LSP) support for code intelligence, a permission system for controlling file and shell access, session management with forking and sharing capabilities, and Model Context Protocol (MCP) integration for extending context sources. OpenCode positions itself as a provider-agnostic alternative to proprietary solutions, ensuring developers aren't locked into a single AI provider as the ecosystem evolves.

## CLI Commands

The main command-line interface providing interactive TUI, headless server, and one-shot execution modes.

```bash
# Launch interactive terminal UI
opencode

# One-shot coding task with automatic execution
opencode run "add unit tests for the user service"

# Continue from last session
opencode run --continue "now add integration tests"

# Use specific model and agent
opencode run --model anthropic/claude-3-5-sonnet-20241022 --agent build "refactor auth module"

# Attach files to the prompt
opencode run --file src/auth.ts --file test/auth.test.ts "review these files for security issues"

# Execute custom command from .opencode/command/
opencode run --command commit "implemented feature X"

# JSON output for scripting and automation
opencode run --format json "fix linting errors" | jq -r 'select(.type=="session.updated")'

# Start headless server on custom port
opencode serve --port 4096

# Start ACP server for Zed/IDE integration
opencode acp --cwd /path/to/project

# Start web interface server
opencode web --port 4096

# List available models
opencode models

# Authentication management
opencode auth login anthropic
opencode auth logout anthropic

# GitHub PR workflow
opencode pr 123

# Session management
opencode export SESSION_ID -o session.json
opencode import session.json

# Display session statistics
opencode stats SESSION_ID
```

## Session API

REST API for programmatic session management, message handling, and workflow automation.

```bash
# Create new session
curl -X POST http://localhost:4096/session \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "build",
    "model": {
      "providerID": "anthropic",
      "modelID": "claude-3-5-sonnet-20241022"
    }
  }'

# Send message to session
curl -X POST http://localhost:4096/session/SESSION_ID/message \
  -H "Content-Type: application/json" \
  -d '{
    "parts": [
      {
        "type": "text",
        "text": "Add error handling to the login function"
      },
      {
        "type": "file",
        "url": "file:///path/to/auth.ts",
        "filename": "auth.ts",
        "mime": "text/plain"
      }
    ]
  }'

# List all sessions
curl http://localhost:4096/session

# Get session details including cost and stats
curl http://localhost:4096/session/SESSION_ID

# Fork session at specific message
curl -X POST http://localhost:4096/session/SESSION_ID/fork \
  -H "Content-Type: application/json" \
  -d '{"messageID": "MESSAGE_ID"}'

# Abort running session
curl -X POST http://localhost:4096/session/SESSION_ID/abort

# Revert file changes made in session
curl -X POST http://localhost:4096/session/SESSION_ID/revert \
  -H "Content-Type: application/json" \
  -d '{"files": ["/path/to/file1.ts", "/path/to/file2.ts"]}'

# Share session publicly
curl -X POST http://localhost:4096/session/SESSION_ID/share

# Get session diff summary
curl http://localhost:4096/session/SESSION_ID/diff
```

## SDK Client

TypeScript SDK for embedding OpenCode in applications, scripts, and automation workflows.

```typescript
import { createOpencode } from "@opencode-ai/sdk"

// Create server and client together
const { client, server } = await createOpencode({
  port: 4096,
  hostname: "127.0.0.1"
})

// Create a session with specific agent and model
const session = await client.session.create({
  body: {
    agent: "build",
    model: {
      providerID: "anthropic",
      modelID: "claude-3-5-sonnet-20241022"
    }
  }
})

// Send a prompt with file attachments
await client.session.prompt({
  path: { id: session.id },
  body: {
    parts: [
      {
        type: "text",
        text: "Refactor this code to use async/await"
      },
      {
        type: "file",
        url: "file:///absolute/path/to/file.ts",
        filename: "file.ts",
        mime: "text/plain"
      }
    ]
  }
})

// Subscribe to real-time events
const events = client.event.subscribe()
for await (const event of events) {
  if (event.type === "message.part.updated") {
    console.log("AI response:", event.properties.part.text)
  }
  if (event.type === "tool.execute") {
    console.log("Tool executed:", event.properties.name, event.properties.args)
  }
  if (event.type === "session.updated") {
    if (event.properties.info.status === "completed") {
      console.log("Cost:", event.properties.info.cost)
      break
    }
  }
}

// List sessions with filtering
const allSessions = await client.session.list()

// Get session details
const sessionInfo = await client.session.get({ path: { id: session.id } })
console.log("Total tokens:", sessionInfo.usage?.totalTokens)

// Clean up
await server.close()
```

## Configuration System

Project and global configuration for customizing behavior, permissions, and model settings.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "theme": "github-dark",
  "model": "anthropic/claude-3-5-sonnet-20241022",
  "share": "manual",
  "permission": {
    "edit": "allow",
    "bash": {
      "npm install": "allow",
      "npm test": "allow",
      "git *": "allow",
      "*": "ask"
    }
  },
  "tools": {
    "webfetch": true,
    "bash": true,
    "edit": true
  },
  "agent": {
    "build": {
      "temperature": 0.7,
      "tools": {
        "webfetch": false
      }
    },
    "plan": {
      "temperature": 0.3
    }
  },
  "provider": {
    "anthropic": {
      "options": {
        "apiKey": "{env:ANTHROPIC_API_KEY}",
        "baseURL": "https://api.anthropic.com/v1"
      }
    },
    "openai": {
      "options": {
        "apiKey": "{env:OPENAI_API_KEY}"
      }
    }
  },
  "mcp": {
    "filesystem": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed"],
      "environment": {}
    },
    "github": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-github"],
      "environment": {
        "GITHUB_TOKEN": "{env:GITHUB_TOKEN}"
      }
    }
  },
  "keybinds": {
    "leader": "ctrl+x",
    "app_help": "<leader>h",
    "session_new": "<leader>n",
    "session_delete": "<leader>d",
    "agent_cycle": "tab",
    "message_stop": "ctrl+c"
  }
}
```

## Custom Agents

User-defined agents with specialized system prompts, tool access, and permission configurations.

```markdown
---
description: Use for database schema migrations and queries
model: anthropic/claude-3-5-sonnet-20241022
temperature: 0.5
tools:
  bash: true
  edit: true
  webfetch: false
permission:
  edit:
    "*.sql": allow
    "migrations/*": allow
    "*": deny
  bash:
    "psql *": allow
    "pg_dump *": allow
    "*": ask
---

You are a database expert specializing in PostgreSQL migrations.

When creating migrations:
- Always use transactions
- Include rollback statements
- Add descriptive comments
- Follow the naming convention: YYYYMMDD_description.sql

When querying:
- Use prepared statements
- Explain query plans for complex queries
- Suggest indexes for slow queries

Available database: {env:DATABASE_URL}
```

## Custom Commands

Reusable command templates with variable substitution and agent configuration.

```markdown
---
description: Create comprehensive test suite
agent: build
---

Create tests for $ARGUMENTS

Requirements:
- Unit tests with 100% coverage
- Integration tests for API endpoints
- Mock external dependencies
- Use Jest and Supertest
- Follow AAA pattern (Arrange, Act, Assert)

Test files should be placed in __tests__/ directory adjacent to source files.
Include both happy path and error cases.
```

```bash
# Usage
opencode run --command test "authentication module"

# The $ARGUMENTS placeholder gets replaced with "authentication module"
```

## Plugin System

Custom plugins for extending OpenCode with tools, event handlers, and hooks.

```typescript
// .opencode/plugin/database-tools.ts
import type { Plugin } from "@opencode-ai/plugin"
import { createPool } from '@vercel/postgres'

export default async function({ client, project, directory, $ }): Promise<Plugin> {
  const pool = createPool({ connectionString: process.env.DATABASE_URL })

  return {
    // Add custom tool
    tool: {
      database_query: {
        description: "Execute PostgreSQL query and return results",
        args: {
          query: {
            type: "string",
            description: "SQL query to execute"
          },
          params: {
            type: "array",
            description: "Query parameters",
            items: { type: "string" }
          }
        },
        execute: async (args, ctx) => {
          try {
            const result = await pool.query(args.query, args.params)
            return JSON.stringify({
              rowCount: result.rowCount,
              rows: result.rows
            }, null, 2)
          } catch (error) {
            return `Error: ${error.message}`
          }
        }
      },

      database_schema: {
        description: "Get table schema information",
        args: {
          table: { type: "string", description: "Table name" }
        },
        execute: async (args) => {
          const query = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = $1
            ORDER BY ordinal_position
          `
          const result = await pool.query(query, [args.table])
          return JSON.stringify(result.rows, null, 2)
        }
      }
    },

    // Hook into events
    event: async ({ event }) => {
      if (event.type === "session.completed") {
        // Auto-generate migration after schema changes
        const changedFiles = event.properties.files?.filter(f =>
          f.endsWith('.sql') || f.includes('schema')
        )
        if (changedFiles?.length > 0) {
          console.log("Schema changes detected:", changedFiles)
        }
      }
    },

    // Modify chat parameters before sending to LLM
    "chat.params": async (input, output) => {
      // Lower temperature for database operations
      if (input.message?.text?.includes("migration") || input.message?.text?.includes("schema")) {
        output.temperature = 0.3
      }
    },

    // Hook before tool execution
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash" && input.input.command?.includes("DROP")) {
        console.warn("⚠️  Destructive database operation detected!")
      }
    }
  }
}
```

## Search APIs

File and text search using ripgrep and fuzzy finding for code navigation.

```bash
# Search for text in files (ripgrep)
curl "http://localhost:4096/find?pattern=async%20function&glob=*.ts&limit=10"

# Case-insensitive search with context
curl "http://localhost:4096/find?pattern=error&case_insensitive=true&context=3"

# Find files by name pattern
curl "http://localhost:4096/find/file?query=test&limit=20"

# Find workspace symbols (functions, classes, etc)
curl "http://localhost:4096/find/symbol?query=handleLogin"

# Get file status (git status + diagnostics)
curl "http://localhost:4096/file/status"

# List directory contents
curl "http://localhost:4096/file?path=/src/components"

# Read file contents
curl "http://localhost:4096/file/content?path=/src/App.tsx"
```

## Tool System

Built-in tools available to agents for file operations, shell execution, and code analysis.

```typescript
// Tools are automatically available to agents based on configuration
// Configuration in opencode.json controls tool availability

// Read Tool - Read file contents with line numbers
{
  "tool": "read",
  "input": {
    "filePath": "/absolute/path/to/file.ts",
    "offset": 10,      // Start from line 10
    "limit": 50        // Read 50 lines
  }
}

// Edit Tool - Smart string replacement with fallback strategies
{
  "tool": "edit",
  "input": {
    "filePath": "/path/to/file.ts",
    "oldString": "function login() {",
    "newString": "async function login() {",
    "replaceAll": false
  }
}

// Bash Tool - Execute shell commands with timeout
{
  "tool": "bash",
  "input": {
    "command": "npm test -- --coverage",
    "description": "Run tests with coverage",
    "timeout": 300000,
    "runInBackground": false
  }
}

// Grep Tool - Search text in files using ripgrep
{
  "tool": "grep",
  "input": {
    "pattern": "TODO|FIXME",
    "path": "/src",
    "glob": "*.{ts,tsx}",
    "outputMode": "content",
    "lineNumbers": true,
    "context": 2
  }
}

// Glob Tool - Find files by pattern
{
  "tool": "glob",
  "input": {
    "pattern": "**/*.test.ts",
    "path": "/src"
  }
}

// LSP Diagnostics Tool - Get language server diagnostics
{
  "tool": "lsp-diagnostics",
  "input": {
    "uri": "file:///path/to/file.ts"
  }
}

// Task Tool - Delegate to subagent
{
  "tool": "task",
  "input": {
    "description": "Research authentication patterns",
    "prompt": "Research and summarize OAuth 2.0 vs JWT authentication patterns",
    "subagentType": "general"
  }
}
```

## Session Management

Export and import sessions for sharing, backup, or transferring work between machines.

```bash
# Export a session to JSON file
opencode export SESSION_ID -o session.json

# Import a session from JSON file
opencode import session.json

# View session statistics
opencode stats SESSION_ID

# Use cases:
# - Share complete coding sessions with teammates
# - Backup important work sessions
# - Transfer sessions between machines
# - Reproduce AI interactions for debugging
# - Attach sessions to GitHub PRs for context
```

## Web Interface

Start OpenCode with a web-accessible interface for remote access and collaboration.

```bash
# Start web interface on default port (auto-assigned)
opencode web

# Start on specific port
opencode web --port 4096

# Listen on all network interfaces for LAN access
opencode web --hostname 0.0.0.0

# The web command starts a server and opens the web UI in your browser
# Access from other devices on your network using the displayed URLs
```

## GitHub Integration

OpenCode provides powerful GitHub integration for PR reviews and automated responses to issues and comments.

### GitHub PR Workflow

Streamlined workflow for reviewing and working on GitHub pull requests directly from the command line.

```bash
# Checkout a PR and start OpenCode session
opencode pr 123

# This command:
# - Fetches the PR using gh CLI
# - Creates a local branch named pr/123
# - Checks out the PR branch (including fork PRs)
# - Detects and imports shared OpenCode session from PR description if available
# - Launches interactive TUI for the PR

# Requirements:
# - gh CLI must be installed and authenticated
# - Must be run from a git repository
```

### GitHub Agent

Install and run OpenCode as a GitHub App agent to automatically respond to PR comments and issues.

```bash
# Install GitHub agent for your repository
opencode github install

# Run GitHub agent (typically in CI/CD)
opencode github run

# The GitHub agent can:
# - Respond to @opencode mentions in PR comments
# - Automatically review PRs when requested
# - Answer questions about code in issue comments
# - Make code changes based on feedback
# - Works with GitHub Actions integration
```

## ACP Integration

Agent Client Protocol support for IDE integration with editors like Zed.

```json
{
  "agent_servers": {
    "OpenCode": {
      "command": "opencode",
      "args": ["acp"],
      "settings": {
        "model": "anthropic/claude-3-5-sonnet-20241022",
        "agent": "build"
      }
    }
  }
}
```

```bash
# Start ACP server manually
opencode acp --cwd /path/to/project

# The ACP server provides:
# - Session management integrated with IDE
# - Prompt handling from editor context
# - Tool execution with IDE visibility
# - Streaming responses for real-time feedback
# - File operations synchronized with editor
```

## Event Streaming

Server-Sent Events (SSE) for real-time updates on session progress, tool execution, and AI responses.

```typescript
// Using SDK
const events = client.event.subscribe()
for await (const event of events) {
  switch (event.type) {
    case "session.updated":
      console.log("Status:", event.properties.info.status)
      console.log("Cost:", event.properties.info.cost)
      break

    case "message.part.updated":
      if (event.properties.part.type === "text") {
        process.stdout.write(event.properties.part.text)
      }
      break

    case "tool.execute":
      console.log(`\nTool: ${event.properties.name}`)
      console.log("Input:", event.properties.input)
      break

    case "tool.result":
      console.log("Output:", event.properties.output)
      break

    case "file.edited":
      console.log("File changed:", event.properties.file)
      break
  }
}
```

```bash
# Using curl with SSE
curl -N http://localhost:4096/event

# Events are streamed as:
# data: {"type":"session.updated","properties":{...}}
# data: {"type":"message.part.updated","properties":{...}}
# data: {"type":"tool.execute","properties":{...}}
```

## Summary

OpenCode serves as a versatile AI coding assistant supporting multiple deployment models from interactive terminal sessions to fully automated CI/CD integrations. Primary use cases include interactive pair programming where developers collaborate with AI models through the TUI, automated code generation and refactoring integrated into build pipelines, code review automation for pull requests through GitHub integration, test suite generation and maintenance, documentation creation, and debugging assistance. The platform excels at large-scale codebase transformations through its session management and file tracking capabilities, making it valuable for modernization projects, dependency upgrades, and consistent style enforcement across repositories. The GitHub agent integration enables automated PR reviews and issue responses, while session import/export allows teams to share complete coding contexts.

Integration patterns range from simple command-line usage for ad-hoc tasks to sophisticated programmatic control via the TypeScript SDK for building custom automation workflows. The plugin system enables teams to extend OpenCode with domain-specific tools like database query capabilities, API testing utilities, or deployment automation. The ACP protocol integration brings OpenCode's capabilities directly into modern editors like Zed, while the client/server architecture supports innovative use cases like mobile-controlled development sessions via the web interface or shared team coding environments. The permission system and configuration hierarchy allow fine-grained control over AI behavior, making OpenCode suitable for both personal projects and enterprise environments with strict security requirements.
