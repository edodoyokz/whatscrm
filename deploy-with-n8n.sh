#!/bin/bash

# Script Deployment WhatsApp CRM terintegrasi dengan n8n-production
# Jalankan script ini di direktori n8n-production untuk menambahkan WhatsApp CRM

set -e

echo "🚀 Deploying WhatsApp CRM to n8n-production..."

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

# Check if we're in n8n-production directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the n8n-production directory"
    exit 1
fi

# Check if whatscrm directory exists
if [ ! -d "whatscrm" ]; then
    print_status "Creating whatscrm directory..."
    mkdir -p whatscrm
fi

# Copy WhatsApp CRM files to whatscrm directory
print_status "Copying WhatsApp CRM files..."
cp -r ../whatscrm/* whatscrm/

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p whatscrm/logs whatscrm/uploads whatscrm/config whatscrm/sessions whatscrm/conversations

# Set proper permissions
print_status "Setting proper permissions..."
chmod 755 whatscrm/logs whatscrm/uploads whatscrm/config whatscrm/sessions whatscrm/conversations

# Create .env file for WhatsApp CRM if not exists
print_status "Setting up environment configuration..."
if [ ! -f "whatscrm/.env" ]; then
    cp whatscrm/.env.docker whatscrm/.env
    print_warning "Please edit whatscrm/.env file with your production settings"
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
docker build -t whatscrm-ai:latest ./whatscrm

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

print_status "🎉 WhatsApp CRM deployment completed successfully!"
print_status "📱 WhatsApp CRM is now running on port 3000"
print_status "🔗 Access URLs:"
print_status "   - WhatsApp CRM: http://localhost:3000"
print_status "   - n8n: http://localhost:5678"
print_status "   - Nginx Proxy Manager: http://localhost:81"
print_status ""
print_status "🔧 Useful commands:"
print_status "   - View logs: docker-compose logs -f whatscrm-ai"
print_status "   - Restart: docker-compose restart whatscrm-ai"
print_status "   - Stop: docker-compose stop whatscrm-ai"
print_status "   - Update: ./deploy-with-n8n.sh" 