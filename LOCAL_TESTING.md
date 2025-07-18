# Local Testing Setup for WhatsApp CRM AI

## Prerequisites
- Node.js 18+ installed on Windows
- Git Bash or PowerShell
- MySQL/PostgreSQL local instance (optional)

## Quick Local Test Setup

### 1. Install Dependencies
```bash
# Navigate to project directory
cd d:\edo\whatscrm

# Install all dependencies
npm install
```

### 2. Create Local Environment File
```bash
# Copy and create .env.local
cp .env.example .env.local
```

### 3. Environment Variables for Local Testing
```env
NODE_ENV=development
PORT=3000

# Database (can use SQLite for quick testing)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=whatscrm_test
DB_USER=root
DB_PASSWORD=

# JWT Secret
JWT_SECRET=local-test-secret-key

# AI Providers (optional for basic testing)
OPENAI_API_KEY=your-openai-key
GOOGLE_API_KEY=your-google-key

# Redis (optional - will use memory cache if not available)
REDIS_URL=redis://localhost:6379
```

### 4. Test Scripts

#### Basic Syntax Check
```bash
# Check for syntax errors in all JS files
node -c app.js
node -c routes/*.js
node -c ai/*.js
```

#### Quick Route Test
```bash
# Test individual route files
node -e "require('./routes/dashboard.js')"
node -e "require('./routes/ai_enhanced.js')"
node -e "require('./routes/ai_realtime.js')"
```

#### Start Server Test
```bash
# Start server with minimal dependencies
npm start
```

### 5. Docker Testing Locally

#### Build Test
```bash
# Test Docker build locally
docker build -t whatscrm-test .
```

#### Run Test Container
```bash
# Run container with basic setup
docker run -p 3000:3000 -e NODE_ENV=development whatscrm-test
```

## Troubleshooting

### Common Issues:
1. **Missing Dependencies**: Run `npm install` 
2. **Port Conflicts**: Change PORT in .env
3. **Database Errors**: Use in-memory DB for testing
4. **Module Not Found**: Check file paths and exports

### Quick Fixes:
```bash
# Reset node modules
rm -rf node_modules package-lock.json
npm install

# Check file structure
find . -name "*.js" -type f | head -20

# Test specific modules
node -e "console.log(require('./ai/natural_conversation_engine.js'))"
```
