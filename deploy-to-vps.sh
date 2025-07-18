#!/bin/bash

# Script Deployment WhatsApp CRM ke VPS
# Pastikan VPS sudah terinstall Docker dan Docker Compose

set -e  # Exit on any error

echo "🚀 Starting WhatsApp CRM Deployment to VPS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check Docker installation
print_status "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_status "Docker and Docker Compose are installed ✓"

# Create deployment directory
DEPLOY_DIR="/opt/whatscrm"
print_status "Creating deployment directory: $DEPLOY_DIR"
sudo mkdir -p $DEPLOY_DIR
sudo chown $USER:$USER $DEPLOY_DIR

# Copy project files
print_status "Copying project files..."
cp -r . $DEPLOY_DIR/
cd $DEPLOY_DIR

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs uploads config sessions conversations

# Set proper permissions
print_status "Setting proper permissions..."
chmod +x deploy-to-vps.sh
chmod 755 logs uploads config sessions conversations

# Create production .env file
print_status "Creating production environment file..."
if [ ! -f .env ]; then
    cp .env.docker .env
    print_warning "Please edit .env file with your production settings"
fi

# Build Docker image
print_status "Building Docker image..."
docker build -t whatscrm:latest .

if [ $? -eq 0 ]; then
    print_status "Docker image built successfully ✓"
else
    print_error "Docker build failed"
    exit 1
fi

# Start services with docker-compose
print_status "Starting services with Docker Compose..."
docker-compose up -d

if [ $? -eq 0 ]; then
    print_status "Services started successfully ✓"
else
    print_error "Failed to start services"
    exit 1
fi

# Check service status
print_status "Checking service status..."
sleep 10
docker-compose ps

# Show logs
print_status "Recent logs:"
docker-compose logs --tail=20

print_status "🎉 Deployment completed successfully!"
print_status "📱 WhatsApp CRM is now running on port 3000"
print_status "🔧 To view logs: docker-compose logs -f"
print_status "🛑 To stop services: docker-compose down"
print_status "🔄 To restart: docker-compose restart" 