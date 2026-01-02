#!/bin/bash

set -e

echo "=== FINAL COMPREHENSIVE EMAIL CLEANUP ==="

# Clean main repository
echo "Cleaning main repository..."
cd /home/pixel/pixel
git reset --hard origin/master
git filter-branch -f --env-filter '
if [ "$GIT_AUTHOR_EMAIL" = "jorge.paradadiaz@razorfish.com" ]; then
    export GIT_AUTHOR_EMAIL="pixel@pixel.xx"
    export GIT_AUTHOR_NAME="Pixel"
fi
if [ "$GIT_COMMITTER_EMAIL" = "jorge.paradadiaz@razorfish.com" ]; then
    export GIT_COMMITTER_EMAIL="pixel@pixel.xx"
    export GIT_COMMITTER_NAME="Pixel"
fi
' --all
git push --force origin master

# Clean lnpixels
echo "Cleaning lnpixels..."
cd /home/pixel/pixel/lnpixels
git reset --hard origin/main
git filter-branch -f --env-filter '
if [ "$GIT_AUTHOR_EMAIL" = "jorge.paradadiaz@razorfish.com" ]; then
    export GIT_AUTHOR_EMAIL="pixel@pixel.xx"
    export GIT_AUTHOR_NAME="Pixel"
fi
if [ "$GIT_COMMITTER_EMAIL" = "jorge.paradadiaz@razorfish.com" ]; then
    export GIT_COMMITTER_EMAIL="pixel@pixel.xx"
    export GIT_COMMITTER_NAME="Pixel"
fi
' --all
git push --force origin main

# Clean pixel-agent
echo "Cleaning pixel-agent..."
cd /home/pixel/pixel/pixel-agent
git reset --hard origin/master
git filter-branch -f --env-filter '
if [ "$GIT_AUTHOR_EMAIL" = "jorge.paradadiaz@razorfish.com" ]; then
    export GIT_AUTHOR_EMAIL="pixel@pixel.xx"
    export GIT_AUTHOR_NAME="Pixel"
fi
if [ "$GIT_COMMITTER_EMAIL" = "jorge.paradadiaz@razorfish.com" ]; then
    export GIT_COMMITTER_EMAIL="pixel@pixel.xx"
    export GIT_COMMITTER_NAME="Pixel"
fi
' --all
git push --force origin master

echo "=== CLEANUP COMPLETE ==="
echo "All repositories have been cleaned of jorge.paradadiaz@razorfish.com"
echo "Replaced with: Pixel <pixel@pixel.xx>"