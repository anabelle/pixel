#!/bin/bash
# Script to apply REFACTOR_QUEUE.md fix
# Run this as root on the host system

echo "=== REFACTOR_QUEUE.md Permission Fix ==="
echo ""
echo "This script will:"
echo "1. Backup the current REFACTOR_QUEUE.md"
echo "2. Replace it with the updated version (includes T079)"
echo "3. Verify the changes"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "ERROR: This script must be run as root"
    echo "Use: sudo bash APPLY_FIX.sh"
    exit 1
fi

# Backup current file
echo "Step 1: Backing up current file..."
cp /pixel/REFACTOR_QUEUE.md /pixel/REFACTOR_QUEUE.md.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ Backup created"

# Replace file
echo "Step 2: Replacing file with updated version..."
cp /pixel/REFACTOR_QUEUE.md.new /pixel/REFACTOR_QUEUE.md
echo "✓ File replaced"

# Verify changes
echo "Step 3: Verifying changes..."
echo ""
echo "Current READY task count:"
grep "⬜ READY" /pixel/REFACTOR_QUEUE.md | wc -l

echo ""
echo "T079 task present:"
if grep -q "T079: Implement Organizational Automation Pipeline" /pixel/REFACTOR_QUEUE.md; then
    echo "✓ T079 found in queue"
else
    echo "✗ T079 NOT found"
fi

echo ""
echo "File permissions:"
ls -la /pixel/REFACTOR_QUEUE.md

echo ""
echo "=== FIX APPLIED SUCCESSFULLY ==="
echo "REFACTOR_QUEUE.md now includes T079: Organizational Automation Pipeline (MANDATORY)"
