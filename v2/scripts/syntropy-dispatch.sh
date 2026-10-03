#!/usr/bin/env bash
set -euo pipefail
# Correct project + fresh session; deterministic Python owns queues/locks.
cd /home/pixel/pixel
exec /usr/bin/python3 /home/pixel/pixel/v2/scripts/syntropy-dispatch.py "$@"
