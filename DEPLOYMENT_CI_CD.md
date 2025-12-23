# Pixel Ecosystem - GitHub Actions CI/CD Setup

## Overview

This setup provides automated deployment for the Pixel multi-repo ecosystem using GitHub Actions.

**Architecture**: Centralized deployment from root `pixel` repository with per-submodule CI for testing.

## Workflow Files

### Root Deployment Workflow
**File**: `.github/workflows/deploy-production.yml`
- **Triggers**: Push to `pixel/master` branch
- **Actions**:
  1. Checkout with all submodules recursively
  2. Setup Node.js, Bun, pnpm
  3. Build all services (LNPixels, Agent, Landing, Syntropy)
  4. Upload build artifacts
  5. Deploy to VPS via SSH/rsync
  6. Restart PM2 processes
  7. Verify health checks

### Submodule CI Workflows (Testing Only)

| Repo | Workflow | Purpose | Deploy? |
|------|-----------|---------|----------|
| `pixel-agent/.github/workflows/ci.yml` | Build & test Pixel Agent | NO |
| `lnpixels/.github/workflows/ci.yml` | Build & test LNPixels | NO |

**Key**: These workflows test code on every push/PR but do NOT deploy. Only root `deploy-production.yml` deploys.

## Deployment Flow

```
1. Developer pushes to pixel-agent/master
   → pixel-agent CI runs (build + test)
   → NO deployment happens

2. Developer updates root submodule pointer
   cd ..
   git add pixel-agent
   git commit -m "chore: update pixel-agent submodule"

3. Developer pushes to pixel/master
   → deploy-production.yml triggers
   → Builds ALL services together
   → Deploys to VPS via SSH
   → PM2 restarts all processes atomically
```

## Required GitHub Secrets

Add these to **Pixel repo** (anabelle/pixel) → Settings → Secrets:

| Secret Name | Description | Example |
|-------------|-------------|----------|
| `SSH_PRIVATE_KEY` | VPS SSH private key | `-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----` |
| `GH_PAT_FOR_SUBMODULES` | Personal Access Token for private submodules | `ghp_xxxxxxxxxxxxxxxxxxxx` |

**Important**: Secrets go in ROOT repo only. Submodule CI workflows don't need secrets.

## Environment Variables

Configured in `.github/workflows/deploy-production.yml`:

```yaml
env:
  VPS_USER: pixel
  VPS_HOST: pixel.xx.kg
  NODE_VERSION: '20'
  BUN_VERSION: '1.1.0'
  PNPM_VERSION: '9'
```

## VPS Requirements

The VPS at `pixel.xx.kg` must have:

1. **SSH access** configured for `pixel@pixel.xx.kg`
2. **PM2 installed** with services defined in `ecosystem.config.js`
3. **rsync available** for file syncing
4. **Node.js 20+** and **Bun 1.1+** installed
5. **Backup script**: `autonomous-backup.sh` at `/home/pixel/`
6. **Directory structure**: `/home/pixel/` containing all repos

## Manual Deployment Triggers

### Option 1: Push to Master (Automatic)
```bash
# After updating submodules locally
git add .
git commit -m "chore: update submodules"
git push origin master  # Triggers deployment
```

### Option 2: Manual Dispatch (Via GitHub UI)
1. Go to https://github.com/anabelle/pixel/actions
2. Click "Deploy Pixel Ecosystem to Production"
3. Click "Run workflow"
4. Choose options:
   - `skip_tests`: Skip running tests
   - `skip_build`: Skip build (use existing artifacts)

## Troubleshooting

### Deployment Failed

**Check GitHub Actions logs**:
1. Go to Actions tab in pixel repo
2. Click on failed workflow run
3. Expand each step to see error messages

**Common Issues**:

| Issue | Solution |
|-------|----------|
| SSH connection failed | Verify `SSH_PRIVATE_KEY` secret format (single line, no extra spaces) |
| Submodules not checked out | Verify `GH_PAT_FOR_SUBMODULES` has `repo` scope |
| Build failed | Run build locally first: `pnpm run build` |
| PM2 restart failed | SSH to VPS manually and check `pm2 status` |
| Health checks failing | Verify services are running: `curl http://pixel.xx.kg:3000/health` |

### Rollback

If deployment causes issues, rollback to previous state:

```bash
# On VPS
ssh pixel@pixel.xx.kg
cd /home/pixel/backups

# List available backups
ls -lt

# Restore latest backup
./restore-latest.sh

# Restart services
pm2 restart all
```

## Deployment Safety Rules

### Rule 1: Always Push Submodules First

❌ **WRONG**:
```bash
cd pixel-agent
git commit -amend "oops forgot to push"
cd ..
git add pixel-agent
git commit -m "update submodule"
git push  # Deploys OUTDATED code!
```

✅ **CORRECT**:
```bash
cd pixel-agent
git commit -amend "oops forgot to push"
git push  # Push submodule FIRST
cd ..
git add pixel-agent
git commit -m "update submodule"
git push  # Now deploys LATEST code
```

### Rule 2: Test Locally Before Deploy

```bash
# Run health check locally
npm run doctor

# Build locally
pnpm run build

# Test services (if possible)
pnpm run test
```

### Rule 3: Don't Push to Master if Tests Failing

If submodule CI shows failing tests:
1. Fix tests locally
2. Push to feature branch
3. Create PR for review
4. Only merge to master when green

## Monitoring

### Post-Deployment Checks

After deployment, verify:

```bash
# PM2 status
ssh pixel@pixel.xx.kg "pm2 status"

# Health endpoints
curl https://ln.pixel.xx.kg/health
curl https://pixel.xx.kg/
curl http://pixel.xx.kg:5173/

# View logs
ssh pixel@pixel.xx.kg "pm2 logs --lines 50"
```

## Development Workflow

### Typical Developer Workflow

```bash
# 1. Work on feature in submodule
cd pixel-agent
git checkout -b feature/new-ability

# 2. Make changes, test
bun run dev
npm run test

# 3. Commit and push feature branch
git add .
git commit -m "feat: add new ability"
git push origin feature/new-ability

# 4. Create PR (optional)
gh pr create --base master --title "Add new ability"

# 5. Merge PR (or merge directly if confident)
git checkout master
git merge feature/new-ability
git push origin master

# 6. Update root submodule pointer
cd ..
git add pixel-agent
git commit -m "chore: update pixel-agent submodule"
git push origin master  # THIS TRIGGERS DEPLOYMENT
```

## Next Steps

1. [x] Add workflow files to each repo
   - [ ] Commit `.github/workflows/deploy-production.yml` to pixel/master
   - [ ] Commit `.github/workflows/ci.yml` to pixel-agent/master
   - [ ] Commit `.github/workflows/ci.yml` to lnpixels/master
2. [ ] Add `GH_PAT_FOR_SUBMODULES` secret to pixel repo (anabelle/pixel)
3. [ ] Add `SSH_PRIVATE_KEY` secret to pixel repo
4. [ ] Test deployment on feature branch first
5. [ ] Monitor first master deployment carefully
6. [ ] Set up Slack/Discord notifications for deployment alerts

## Important: Workflow Files Must Be Committed Separately

The GitHub Actions workflows are now created but NOT yet committed:

| File | Location | Must Be Committed To |
|------|-----------|----------------------|
| `deploy-production.yml` | `pixel/.github/workflows/` | `anabelle/pixel` (root) |
| `ci.yml` | `pixel-agent/.github/workflows/` | `anabelle/pixel-agent` |
| `ci.yml` | `lnpixels/.github/workflows/` | `anabelle/lnpixels` |

### Commit Workflow Files Before Enabling Deployment

```bash
# Commit workflows in each repo separately:

# 1. Root workflow
git add .github/workflows/deploy-production.yml
git commit -m "ci: add production deployment workflow"
git push origin master

# 2. Pixel agent CI (change to submodule)
cd pixel-agent
git add .github/workflows/ci.yml
git commit -m "ci: add pixel agent CI workflow"
git push origin master
cd ..

# 3. LNPixels CI (change to submodule)
cd lnpixels
git add .github/workflows/ci.yml
git commit -m "ci: add lnpixels CI workflow"
git push origin master
cd ..

# 4. Update root submodule pointers
git add pixel-agent lnpixels
git commit -m "chore: update submodule workflow pointers"
git push origin master  # NOW deployment can run!
```

## Why This Matters

Root workflow uses `submodules: recursive` which checks out the exact commit referenced by submodule pointers. If you don't commit the workflow files in the submodules, the root workflow will check out old commits without the workflows.
