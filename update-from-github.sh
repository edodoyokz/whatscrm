#!/bin/bash

# Script Update WhatsApp CRM dari GitHub
# Jalankan script ini untuk update aplikasi tanpa re-clone

set -e

echo "🔄 Updating WhatsApp CRM from GitHub..."

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

WHATSCRM_DIR="whatscrm"

# Check if we're in n8n-production directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the n8n-production directory"
    exit 1
fi

# Check if whatscrm directory exists
if [ ! -d "$WHATSCRM_DIR" ]; then
    print_error "WhatsApp CRM directory not found. Run deploy-from-github.sh first."
    exit 1
fi

# Backup current .env file
print_status "Backing up current configuration..."
if [ -f "$WHATSCRM_DIR/.env" ]; then
    cp $WHATSCRM_DIR/.env $WHATSCRM_DIR/.env.backup
    print_status "Configuration backed up ✓"
fi

# Pull latest changes
print_status "Pulling latest changes from GitHub..."
cd $WHATSCRM_DIR
git fetch origin
git reset --hard origin/main

if [ $? -eq 0 ]; then
    print_status "Latest changes pulled successfully ✓"
else
    print_error "Failed to pull latest changes"
    exit 1
fi

# Restore .env file
if [ -f ".env.backup" ]; then
    cp .env.backup .env
    print_status "Configuration restored ✓"
fi

cd ..

# Rebuild Docker image
print_status "Rebuilding Docker image..."
docker build -t whatscrm-ai:latest ./$WHATSCRM_DIR

if [ $? -eq 0 ]; then
    print_status "Docker image rebuilt successfully ✓"
else
    print_error "Docker build failed"
    exit 1
fi

# Restart WhatsApp CRM service
print_status "Restarting WhatsApp CRM service..."
docker-compose restart whatscrm-ai

if [ $? -eq 0 ]; then
    print_status "Service restarted successfully ✓"
else
    print_error "Failed to restart service"
    exit 1
fi

# Check service status
print_status "Checking service status..."
sleep 5
docker-compose ps whatscrm-ai

# Show recent logs
print_status "Recent logs:"
docker-compose logs --tail=10 whatscrm-ai

print_status "🎉 WhatsApp CRM updated successfully!"
print_status "📱 Service is running on port 3000"
print_status "🔧 To view logs: docker-compose logs -f whatscrm-ai" 