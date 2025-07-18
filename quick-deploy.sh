#!/bin/bash

# Quick Deploy Script - Download dan deploy WhatsApp CRM dari GitHub
# Usage: curl -sSL https://raw.githubusercontent.com/edodoyokz/whatscrm/main/quick-deploy.sh | bash

set -e

echo "🚀 Quick Deploy WhatsApp CRM from GitHub..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Check if we're in n8n-production directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the n8n-production directory"
    exit 1
fi

# Download deployment script
print_status "Downloading deployment script..."
curl -sSL https://raw.githubusercontent.com/edodoyokz/whatscrm/main/deploy-from-github.sh -o deploy-from-github.sh
chmod +x deploy-from-github.sh

# Download update script
print_status "Downloading update script..."
curl -sSL https://raw.githubusercontent.com/edodoyokz/whatscrm/main/update-from-github.sh -o update-from-github.sh
chmod +x update-from-github.sh

# Run deployment
print_status "Starting deployment..."
./deploy-from-github.sh

print_status "🎉 Quick deploy completed!"
print_status "📱 WhatsApp CRM is now running on port 3000"
print_status "🔄 To update in the future: ./update-from-github.sh" 