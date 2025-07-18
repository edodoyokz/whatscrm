#!/bin/bash

echo ""
echo "🧪 Local Testing Suite for WhatsApp CRM AI"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found! Please run from project root.${NC}"
    exit 1
fi

echo "📂 Checking project structure..."
print_status 0 "package.json found"

echo ""
echo "📦 Checking Node.js version..."
node --version
print_status $? "Node.js check"

echo ""
echo "🔍 Installing dependencies if needed..."
if [ ! -d "node_modules" ]; then
    npm install
    print_status $? "Dependencies installation"
else
    echo -e "${GREEN}✅ node_modules exists${NC}"
fi

echo ""
echo "🔍 Syntax check for main files..."
node -c app.js
print_status $? "app.js syntax check"

echo ""
echo "🔍 Testing route imports..."

# Test routes
routes=("dashboard" "ai_enhanced" "ai_realtime" "onboarding" "advanced_features")
for route in "${routes[@]}"; do
    node -e "try { require('./routes/${route}.js'); console.log('✅ ${route}.js OK'); } catch(e) { console.log('❌ ${route}.js error:', e.message); process.exit(1); }" 2>/dev/null
    print_status $? "${route}.js import"
done

echo ""
echo "🔍 Testing AI modules..."

# Test AI modules
ai_modules=("natural_conversation_engine" "context_manager" "sheets_intelligence" "message_processor")
for module in "${ai_modules[@]}"; do
    node -e "try { require('./ai/${module}.js'); console.log('✅ ${module}.js OK'); } catch(e) { console.log('❌ ${module}.js error:', e.message); process.exit(1); }" 2>/dev/null
    print_status $? "${module}.js import"
done

echo ""
echo "🔍 Testing middleware..."

# Test middleware
middlewares=("auth" "user")
for middleware in "${middlewares[@]}"; do
    node -e "try { require('./middlewares/${middleware}.js'); console.log('✅ ${middleware}.js OK'); } catch(e) { console.log('❌ ${middleware}.js error:', e.message); process.exit(1); }" 2>/dev/null
    print_status $? "${middleware}.js import"
done

echo ""
echo "🔍 Testing app.js initialization..."
timeout 5s node -e "
const app = require('./app.js');
console.log('✅ App initialization successful');
process.exit(0);
" 2>/dev/null
print_status $? "App initialization"

echo ""
echo -e "${GREEN}🎉 All tests passed! Ready for Docker deployment.${NC}"
echo ""
echo "🚀 To deploy:"
echo "   1. Run: docker-compose build --no-cache"
echo "   2. Run: docker-compose up -d"
echo "   3. Check: docker-compose logs -f whatscrm-ai"
echo ""
