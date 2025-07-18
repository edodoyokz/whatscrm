#!/bin/bash

# Script Deployment WhatsApp CRM dari GitHub ke VPS
# Jalankan script ini di direktori n8n-production untuk clone dan deploy

set -e

echo "🚀 Deploying WhatsApp CRM from GitHub to VPS..."

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

# Configuration
GITHUB_REPO="https://github.com/edodoyokz/whatscrm.git"
BRANCH="main"
WHATSCRM_DIR="whatscrm"

# Check if we're in n8n-production directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the n8n-production directory"
    exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install git first."
    exit 1
fi

# Remove existing whatscrm directory if exists
if [ -d "$WHATSCRM_DIR" ]; then
    print_status "Removing existing whatscrm directory..."
    rm -rf "$WHATSCRM_DIR"
fi

# Clone from GitHub
print_status "Cloning WhatsApp CRM from GitHub..."
git clone -b $BRANCH $GITHUB_REPO $WHATSCRM_DIR

if [ $? -eq 0 ]; then
    print_status "Repository cloned successfully ✓"
else
    print_error "Failed to clone repository"
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p $WHATSCRM_DIR/logs $WHATSCRM_DIR/uploads $WHATSCRM_DIR/config $WHATSCRM_DIR/sessions $WHATSCRM_DIR/conversations

# Set proper permissions
print_status "Setting proper permissions..."
chmod 755 $WHATSCRM_DIR/logs $WHATSCRM_DIR/uploads $WHATSCRM_DIR/config $WHATSCRM_DIR/sessions $WHATSCRM_DIR/conversations

# Create .env file for WhatsApp CRM if not exists
print_status "Setting up environment configuration..."
if [ ! -f "$WHATSCRM_DIR/.env" ]; then
    if [ -f "$WHATSCRM_DIR/.env.docker" ]; then
        cp $WHATSCRM_DIR/.env.docker $WHATSCRM_DIR/.env
        print_warning "Please edit $WHATSCRM_DIR/.env file with your production settings"
    else
        print_error "No .env.docker file found. Please create .env file manually."
        exit 1
    fi
fi

# Update main docker-compose.yml to include WhatsApp CRM
print_status "Updating main docker-compose.yml..."
if ! grep -q "whatscrm-ai:" docker-compose.yml; then
    # Add WhatsApp CRM service to existing docker-compose.yml
    cat >> docker-compose.yml << 'EOF'

  # WhatsApp CRM AI Assistant
  whatscrm-ai:
    build: ./whatscrm
    restart: always
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=${POSTGRES_DB}
      - DB_USER=${POSTGRES_USER}
      - DB_PASSWORD=${POSTGRES_PASSWORD}
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY:-your_32_character_key}
      - JWT_SECRET=${JWT_SECRET:-your_jwt_secret}
      - GOOGLE_APPLICATION_CREDENTIALS=/app/config/google-credentials.json
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - ./whatscrm/logs:/app/logs
      - ./whatscrm/uploads:/app/uploads
      - ./whatscrm/config:/app/config
      - ./whatscrm/sessions:/app/sessions
      - ./whatscrm/conversations:/app/conversations
    networks:
      - app-network
    depends_on:
      - postgres
      - redis
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
EOF
    print_status "WhatsApp CRM service added to docker-compose.yml ✓"
else
    print_status "WhatsApp CRM service already exists in docker-compose.yml ✓"
fi

# Build WhatsApp CRM Docker image
print_status "Building WhatsApp CRM Docker image..."
docker build -t whatscrm-ai:latest ./$WHATSCRM_DIR

if [ $? -eq 0 ]; then
    print_status "WhatsApp CRM Docker image built successfully ✓"
else
    print_error "Docker build failed"
    exit 1
fi

# Start/restart services
print_status "Starting/restarting services..."
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
print_status "Recent WhatsApp CRM logs:"
docker-compose logs --tail=20 whatscrm-ai

print_status "🎉 WhatsApp CRM deployment from GitHub completed successfully!"
print_status "📱 WhatsApp CRM is now running on port 3000"
print_status "🔗 Access URLs:"
print_status "   - WhatsApp CRM: http://localhost:3000"
print_status "   - n8n: http://localhost:5678"
print_status "   - Nginx Proxy Manager: http://localhost:81"
print_status ""
print_status "🔧 Useful commands:"
print_status "   - View logs: docker-compose logs -f whatscrm-ai"
print_status "   - Restart: docker-compose restart whatscrm-ai"
print_status "   - Update from GitHub: ./deploy-from-github.sh"
print_status "   - Pull latest changes: cd whatscrm && git pull origin main" 