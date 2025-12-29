#!/bin/bash
# Pixel VPS Bootstrap Script - Ubuntu 22.04/24.04
# This script sets up a fresh server for the Pixel / Syntropy ecosystem.

set -e

PROJECT_DIR="/home/$USER/pixel"
REPO_URL="https://github.com/anabelle/pixel.git"

echo "🚀 PIXEL VPS BOOTSTRAP - Starting..."
echo "Target directory: $PROJECT_DIR"

# ============================================
# PHASE 1: System Dependencies
# ============================================
echo "📦 [1/6] Updating system and installing dependencies..."
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

# ============================================
# PHASE 2: Docker Installation
# ============================================
if ! command -v docker &> /dev/null; then
    echo "🐳 [2/6] Installing Docker..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    echo "⚠️  IMPORTANT: You MUST logout and login again for Docker permissions to work."
else
    echo "✅ [2/6] Docker already installed."
fi

# ============================================
# PHASE 3: Firewall Configuration
# ============================================
echo "🛡️  [3/6] Configuring Firewall..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
# Internal ports are NOT exposed; Nginx handles routing.
sudo ufw --force enable

# ============================================
# PHASE 4: Clone Repository
# ============================================
echo "📂 [4/6] Cloning repository..."
if [ -d "$PROJECT_DIR/.git" ]; then
    echo "Repository already exists. Pulling latest..."
    cd $PROJECT_DIR
    git pull --recurse-submodules
else
    git clone --recursive $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
fi

# ============================================
# PHASE 5: Create required directories
# ============================================
echo "🗂️  [5/6] Creating data directories..."
mkdir -p $PROJECT_DIR/data
mkdir -p $PROJECT_DIR/logs
mkdir -p $PROJECT_DIR/backups
mkdir -p $PROJECT_DIR/certbot/conf
mkdir -p $PROJECT_DIR/certbot/www

# Ensure database files exist (Docker would create them as directories otherwise)
touch $PROJECT_DIR/data/pixels.db
touch $PROJECT_DIR/data/activity.db
touch $PROJECT_DIR/data/db.sqlite

# ============================================
# PHASE 6: Make scripts executable
# ============================================
echo "⚙️  [6/6] Setting permissions..."
chmod +x $PROJECT_DIR/scripts/*.sh

# ============================================
# FINAL OUTPUT
# ============================================
echo ""
echo "============================================"
echo "✅ BOOTSTRAP COMPLETE!"
echo "============================================"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. LOGOUT and LOGIN again (for Docker group permissions)"
echo "   $ exit"
echo "   $ ssh pixel@your-server"
echo ""
echo "2. Navigate to project directory:"
echo "   $ cd $PROJECT_DIR"
echo ""
echo "3. Create your .env file with your secrets:"
echo "   $ nano .env"
echo "   (Copy from .env.example or your local backup)"
echo ""
echo "4. FIRST TIME ONLY - Initialize SSL certificates:"
echo "   $ ./scripts/init-ssl.sh"
echo ""
echo "5. Start the ecosystem:"
echo "   $ docker compose up -d --build"
echo ""
echo "6. Verify everything is running:"
echo "   $ docker compose ps"
echo ""
echo "🎉 Syntropy will automatically wake up and audit the ecosystem!"
echo ""
