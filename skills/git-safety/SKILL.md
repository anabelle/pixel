# Skill: Git Safety Net

## What it does
Automatically validates git operations before execution. Prevents common mistakes: pushing to wrong branch, force-pushing master, losing uncommitted work, merge conflicts.

## When to use it
**ALWAYS.** This skill modifies default git behavior. Before ANY `git push`, `git merge`, or destructive operation, the checks run automatically.

## How to apply
Before executing git commands, run these checks:

### Pre-push checklist
1. **Branch verification**
   - `git branch --show-current` → confirm it's the intended branch
   - Never push to `master`/`main` without explicit confirmation
   - Warn if pushing to a branch you don't own

2. **Rebase check**
   - `git fetch origin && git log --oneline origin/<branch>..HEAD` → show commits not on remote
   - If remote ahead: `git pull --rebase origin <branch>` before push
   - If conflicts: STOP and report. Never auto-resolve.

3. **Uncommitted work warning**
   - `git status --short` → if any uncommitted changes, warn before push
   - Option: stash, commit, or abort

4. **Force push protection**
   - If command contains `--force` or `-f`:
     - Block if branch is `master`/`main`/`develop`
     - Require confirmation for other branches
     - Suggest `--force-with-lease` instead

### Pre-merge checklist
1. **Conflict prediction**
   - `git merge --no-commit --no-ff <branch>` → test merge
   - If conflicts: abort and report
   - If clean: proceed with actual merge

2. **Branch hygiene**
   - After successful merge to master: offer to delete feature branch
   - After successful merge to master: offer to push --delete remote branch

### Pre-destructive checklist
Before `git reset --hard`, `git clean -fd`, or similar:
- Show `git status` and `git log --oneline -5`
- Require explicit confirmation
- Suggest creating backup branch first: `git branch backup-<name>`

## Integration pattern
This skill should be called BEFORE any git operation that modifies history or pushes to remote:

```bash
# Instead of: git push origin <branch>
# Do: <run checks> && git push origin <branch>

# Instead of: git merge <branch>
# Do: <run checks> && git merge <branch>
```

## Examples

**Safe push:**
```
→ Pushing to origin/feature/x
✓ Branch: feature/x (not protected)
✓ Remote is up to date
✓ No uncommitted changes
→ Executing: git push origin feature/x
```

**Blocked push:**
```
→ Pushing to origin/master
✗ PROTECTED BRANCH
→ master/main requires explicit --target flag
```

**Conflict detected:**
```
→ Merging feature/y into master
✗ CONFLICT: both modified src/index.ts
→ Abort. Resolve conflicts manually.
```

## Remember
- Better to ask twice than force-push once
- `--force-with-lease` > `--force`
- Backup branches cost nothing
