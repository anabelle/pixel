# Pixel V2 — Single-brain container
# Zero patches. If it needs patching, switch dependencies.

FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/
COPY character.md* ./

# Type check (optional, non-blocking)
# RUN bun run check || true

# ---- Runtime ----
FROM oven/bun:1-alpine

# bash for agent's bash tool, curl for healthcheck/web fetch, docker-cli for Clawstr tool, git for git tools, openssh-client for SSH
RUN apk add --no-cache bash curl docker-cli git openssh-client

WORKDIR /app

# Copy installed deps and source
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/character.md* ./

# Create data directories
RUN mkdir -p /app/conversations /app/skills /app/tools /app/data && \
    chown -R bun:bun /app

USER bun

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:4000/health || exit 1

CMD ["bun", "run", "src/index.ts"]
