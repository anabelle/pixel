# 🏥 Server Restoration Guide

So, the server is locked, and we need to start fresh. Don't worry, we saved the data! 🛡️

Here is your step-by-step guide to getting **LNPixels** back online with all 9,000+ pixels intact.

## 📦 What You Have
1.  **Codebase**: The full project code is safe on your local machine.
2.  **Data**: `pixels.json` contains the complete database of pixels.
3.  **Scripts**:
    -   `restore_pixels.js`: To import the data back into the database.
    -   `download_pixels.py`: The tool we used to save the data (for reference).

---

## 🚀 Speedrun to Recovery (Docker Method - Recommended)

### 1. Provision New Server
Spin up a new VPS (Ubuntu 22.04/24.04 recommended). Set up your SSH key immediately!
**Requirements**: 2GB+ RAM, Docker installed

### 2. Install Docker
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### 3. Clone Repository
```bash
git clone --recursive git@github.com:anabelle/pixel.git
cd pixel
```

### 4. Setup Environment
```bash
cp .env.example .env
nano .env  # Add your API keys
```

### 5. Restore Database
```bash
# Create data directory
mkdir -p data

# Copy backup files to server (from local machine)
scp pixels.json user@server:~/pixel/

# Restore database using Docker
docker compose up -d api  # Start API container temporarily
docker compose exec api node /app/node_modules/.bin/restore_pixels.js /app/pixels.json /app/pixels.db
# Or run locally if node is installed:
# node restore_pixels.js pixels.json data/pixels.db
```

### 6. Launch! 🚀
```bash
docker compose up -d
```

### 7. Verify
```bash
docker compose ps
curl http://localhost:3000/api/stats
```

---

## 🔧 Alternative: Manual Method (PM2)

If you prefer running without Docker:

### 1. Install Dependencies
```bash
# Node.js v20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs python3 build-essential git
npm install -g pm2 bun
```

### 2. Install Packages
```bash
cd pixel
npm install
cd lnpixels && npm install
cd ../pixel-agent && bun install
cd ../pixel-landing && npm install
cd ../syntropy-core && bun install
```

### 3. Restore Database
```bash
node restore_pixels.js pixels.json lnpixels/api/pixels.db
```

### 4. Launch
```bash
pm2 start ecosystem.config.js
```

---

## 🛡️ Future Proofing
1. **Docker Preferred**: Use `docker compose` for consistent deployments
2. **Keep SSH Keys Safe**: Multiple keys if possible
3. **Disable Password Auth ONLY after** verifying SSH access works
4. **Enable Backups**: Run `autonomous-backup.sh` via cron

---

## 📚 Related Docs
- [DOCKER_MIGRATION.md](./DOCKER_MIGRATION.md) - Full Docker setup details
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production operations guide
