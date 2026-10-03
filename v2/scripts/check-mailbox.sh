#!/usr/bin/env bash
set -euo pipefail
# Supervise only this workload. A dead dispatcher cannot leave workers behind.
# Inbox is append-only; completed/held records produce no model calls.
UNIT=syntropy-dispatch.service
if systemctl --user is-active --quiet "$UNIT"; then exit 0; fi
exec systemd-run --user --quiet --collect --unit=syntropy-dispatch \
  --property=RuntimeMaxSec=1100s --property=MemoryMax=900M \
  --property=KillMode=control-group --property=TimeoutStopSec=10s \
  /home/pixel/pixel/v2/scripts/syntropy-dispatch.sh "$@"
