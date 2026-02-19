# Git Auto-Sync Script for Pixel Ecosystem
# Commits and pushes changes from VPS to GitHub

set -e
REPO_ROOT="/home/pixel/pixel"
LOG_FILE="/home/pixel/pixel/logs/git-sync.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

cd "$REPO_ROOT"

# Source GH_TOKEN if available
if [ -f /home/pixel/.env.git ]; then
    source /home/pixel/.env.git
fi

log "Starting git sync..."

# Sync submodules first
for submodule in pixel-agent pixel-landing lnpixels syntropy-core; do
    if [ -d "$REPO_ROOT/$submodule" ]; then
        cd "$REPO_ROOT/$submodule"
        if [ -n "$(git status --porcelain)" ]; then
            git add -A
            git commit -m "chore: auto-sync from VPS [$TIMESTAMP]" || true
            
            # Get default branch
            BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
            
            # Push with token auth
            if [ -n "$GH_TOKEN" ]; then
                git push https://${GH_TOKEN}@github.com/anabelle/$submodule.git $BRANCH 2>&1 | head -5
                log "Pushed $submodule to $BRANCH"
            else
                log "WARNING: No GH_TOKEN, skipping push for $submodule"
            fi
        else
            log "$submodule: no changes"
        fi
    fi
done

# Sync main repo
cd "$REPO_ROOT"
if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "chore: auto-sync from VPS [$TIMESTAMP]" || true
    
    BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "master")
    
    if [ -n "$GH_TOKEN" ]; then
        git push https://${GH_TOKEN}@github.com/anabelle/pixel.git $BRANCH 2>&1 | head -5
        log "Pushed main repo to $BRANCH"
    else
        log "WARNING: No GH_TOKEN, skipping push for main repo"
    fi
else
    log "Main repo: no changes"
fi

log "Git sync complete"
