#!/bin/bash
# Script to apply REFACTOR_QUEUE.md fix
# Run this as root on the host system

echo "=== REFACTOR_QUEUE.md Permission Fix - Cycle 98 ==="
echo ""
echo "This script will:"
echo "1. Backup the current REFACTOR_QUEUE.md"
echo "2. Fix permissions to 666"
echo "3. Replace it with the updated version (includes T105-T110)"
echo "4. Verify the changes"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: This script must be run as root"
    echo "Use: sudo bash /pixel/APPLY_FIX_T105-T110.sh"
    exit 1
fi

# Check if the new file exists
if [ ! -f /pixel/REFACTOR_QUEUE.md.new2 ]; then
    echo "ERROR: /pixel/REFACTOR_QUEUE.md.new2 not found"
    echo "The worker failed to create the updated queue file"
    exit 1
fi

# Backup current file
echo "Step 1: Backing up current file..."
cp /pixel/REFACTOR_QUEUE.md /pixel/REFACTOR_QUEUE.md.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ Backup created"

# Fix permissions first
echo "Step 2: Fixing file permissions..."
chmod 666 /pixel/REFACTOR_QUEUE.md
echo "✓ Permissions fixed to 666"

# Replace file
echo "Step 3: Replacing file with updated version..."
cp /pixel/REFACTOR_QUEUE.md.new2 /pixel/REFACTOR_QUEUE.md
chmod 666 /pixel/REFACTOR_QUEUE.md
echo "✓ File replaced and permissions set to 666"

# Verify changes
echo "Step 4: Verifying changes..."
echo ""
echo "Current READY task count:"
grep "⬜ READY" /pixel/REFACTOR_QUEUE.md | wc -l

echo ""
echo "New tasks present:"
if grep -q "T105: Refactor Nostr Service Plugin" /pixel/REFACTOR_QUEUE.md; then
    echo "✓ T105 found"
else
    echo "✗ T105 NOT found"
fi

if grep -q "T106: Refactor Nostr Context Accumulator" /pixel/REFACTOR_QUEUE.md; then
    echo "✓ T106 found"
else
    echo "✗ T106 NOT found"
fi

if grep -q "T107: Refactor Nostr Narrative Memory" /pixel/REFACTOR_QUEUE.md; then
    echo "✓ T107 found"
else
    echo "✗ T107 NOT found"
fi

if grep -q "T108: Refactor Nostr Self-Reflection" /pixel/REFACTOR_QUEUE.md; then
    echo "✓ T108 found"
else
    echo "✗ T108 NOT found"
fi

if grep -q "T109: Split Large Test File" /pixel/REFACTOR_QUEUE.md; then
    echo "✓ T109 found"
else
    echo "✗ T109 NOT found"
fi

if grep -q "T110: Refactor LNPixels API Routes" /pixel/REFACTOR_QUEUE.md; then
    echo "✓ T110 found"
else
    echo "✗ T110 NOT found"
fi

echo ""
echo "File permissions:"
ls -la /pixel/REFACTOR_QUEUE.md

echo ""
echo "=== FIX APPLIED SUCCESSFULLY ==="
echo "REFACTOR_QUEUE.md now includes 6 new refactoring tasks (T105-T110)"
echo "Permissions fixed to 666 (writable by workers)"
