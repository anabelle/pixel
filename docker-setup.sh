#!/bin/bash
set -e

echo "=== Pixel Docker Setup ==="

# Create data directory
mkdir -p data backups

# Check for existing database in api folder
if [ -f "lnpixels/api/pixels.db" ]; then
    echo "Found existing pixels.db in lnpixels/api/..."
    cp lnpixels/api/pixels.db data/pixels.db
    echo "Copied to data/pixels.db"
elif [ -f "pixels.json" ]; then
    echo "No database found, but pixels.json exists."
    echo "You should run 'node restore_pixels.js pixels.json data/pixels.db' manually if needed."
else
    echo "No data found. Starting fresh."
fi

# Build and start
echo "Building containers..."
docker-compose build

echo "Starting ecosystem..."
docker-compose up -d

echo "=== Status ==="
docker-compose ps
