#!/bin/bash

# Script Setup VPS untuk WhatsApp CRM
# Jalankan script ini di VPS untuk install Docker dan dependencies

set -e

echo "🔧 Setting up VPS for WhatsApp CRM..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    unzip \
    htop \
    nginx

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
    print_status "Docker already installed ✓"
fi

# Install Docker Compose
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    print_status "Docker Compose already installed ✓"
fi

# Add user to docker group
print_status "Adding user to docker group..."
sudo usermod -aG docker $USER

# Start and enable Docker service
print_status "Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

# Install Node.js (for local development/testing)
print_status "Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    print_status "Node.js already installed ✓"
fi

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p /opt/whatscrm
sudo chown $USER:$USER /opt/whatscrm

# Setup firewall (optional)
print_status "Setting up firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw --force enable

# Setup Nginx (optional reverse proxy)
print_status "Setting up Nginx configuration..."
sudo tee /etc/nginx/sites-available/whatscrm << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site (uncomment if you have domain)
# sudo ln -s /etc/nginx/sites-available/whatscrm /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx

print_status "🎉 VPS setup completed successfully!"
print_status "📋 Next steps:"
print_status "1. Upload your project files to /opt/whatscrm"
print_status "2. Run: cd /opt/whatscrm && ./deploy-to-vps.sh"
print_status "3. Edit .env file with your production settings"
print_status "4. Configure your domain in Nginx if needed"

print_warning "Please reboot the system or logout/login to apply docker group changes" 