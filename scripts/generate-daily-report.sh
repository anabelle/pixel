#!/bin/bash

set -e

cd /pixel

echo "[INTELLIGENCE] Starting daily intelligence report generation..."

bun run /pixel/src/workers/intelligence-reporter.ts

if [ $? -eq 0 ]; then
  echo "[INTELLIGENCE] Daily report generation completed successfully"
  exit 0
else
  echo "[INTELLIGENCE] Daily report generation failed"
  exit 1
fi
