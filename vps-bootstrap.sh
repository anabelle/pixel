#!/bin/bash
# Pixel VPS Bootstrap Script
# This script sets up a fresh server for the Pixel / Syntropy ecosystem.

set -e

echo "🚀 Starting Pixel VPS Bootstrap..."

# 1. Update and install basic dependencies
echo "📦 Updating system and installing dependencies..."
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

# 3. Add current user to docker group
echo "👤 Adding $USER to docker group..."
sudo usermod -aG docker $USER
echo "⚠️  Note: You may need to logout and login again for docker group changes to take effect."

# 4. Configure Firewall
echo "🛡️  Configuring Firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000:3003/tcp
# sudo ufw --force enable

# 5. Project Setup Placeholder
echo "📂 Project location: $HOME/pixel"
mkdir -p $HOME/pixel

echo "✅ Bootstrap Complete!"
echo "Next steps:"
echo "1. Logout and login again (for Docker permissions)."
echo "2. Clone the repo: git clone --recursive https://github.com/anabelle/pixel.git $HOME/pixel"
echo "3. CD into the directory: cd $HOME/pixel"
echo "4. Create your .env file."
echo "5. Start the ecosystem: docker compose up -d --build"
echo ""
echo "Syntropy will automatically wake up and begin the Ecosystem Audit."
