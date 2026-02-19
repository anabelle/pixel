#!/bin/bash
# Triggers an immediate Syntropy cycle by removing the schedule file and restarting the container.

# Resolve the root directory (assuming script is in scripts/maintenance currently)
# If script is in scripts/maintenance, then up 2 levels is root.
# Getting absolute path of the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIXEL_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

SCHEDULE_FILE="$PIXEL_ROOT/data/syntropy-schedule.json"

echo "Triggering Syntropy cycle..."
echo "Pixel Root: $PIXEL_ROOT"

if [ -f "$SCHEDULE_FILE" ]; then
  echo "Removing schedule file to force immediate run..."
  rm "$SCHEDULE_FILE"
else
  echo "No schedule file found (already ready to run?)"
fi

echo "Restarting syntropy container..."
# Using --project-directory to ensure correct context if run from elsewhere
docker compose --project-directory "$PIXEL_ROOT" restart syntropy

echo "Done. Syntropy should start a new cycle immediately."
echo "You can follow logs with: docker compose logs -f syntropy"
