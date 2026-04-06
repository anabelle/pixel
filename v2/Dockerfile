# Pixel V2 — Single-brain container
# Runtime patch for Baileys v6 LID bug applied in entrypoint.sh

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

# ---- OpenViking builder ----
FROM oven/bun:1-alpine AS openviking-builder

RUN apk add --no-cache curl python3 python3-dev py3-pip py3-virtualenv go make gcc g++ cmake musl-dev libffi-dev openssl-dev && \
    curl https://sh.rustup.rs -sSf | sh -s -- -y --profile minimal

ENV PATH="/root/.cargo/bin:${PATH}"

RUN python3 -m venv /opt/openviking-venv && \
    . /opt/openviking-venv/bin/activate && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir openviking==0.2.6

# ---- Runtime ----
FROM oven/bun:1-alpine

# bash for agent's bash tool, curl for healthcheck/web fetch, docker-cli for Clawstr tool, git for git tools, openssh-client for SSH
# su-exec for entrypoint to drop privileges (alpine equivalent of gosu)
# ffmpeg for audio format conversion (MP3→OGG/Opus for Telegram voice replies)
# nodejs/npm for pi-compatible extension tooling and self-learning setup
# python3 + libstdc++ for OpenViking runtime server
RUN apk add --no-cache bash curl docker-cli git openssh-client su-exec ffmpeg nodejs npm python3 libstdc++

WORKDIR /app

# Copy installed deps and source
COPY --from=builder /app/node_modules ./node_modules
COPY --from=openviking-builder /opt/openviking-venv /opt/openviking-venv
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/character.md* ./

# Create data directories (including .pi/external for bind-mount fallback)
RUN mkdir -p /app/conversations /app/skills /app/tools /app/data /app/external /app/.pi && \
    chown -R bun:bun /app

# Copy server registry (multi-server SSH config)
COPY servers.json ./

# Copy scripts (Baileys LID patch, etc.)
COPY scripts/ ./scripts/

# Entrypoint runs as root to fix bind-mount permissions, then drops to bun
COPY entrypoint.sh ./
RUN chmod +x /app/entrypoint.sh

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:4000/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
