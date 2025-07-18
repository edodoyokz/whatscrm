# 🚀 WhatsApp CRM Deployment Guide

## 📋 Overview
Guide ini menjelaskan cara deploy WhatsApp CRM ke VPS dengan integrasi n8n-production yang sudah ada.

## 🎯 Prerequisites
- VPS dengan Ubuntu 20.04+ atau Debian 11+
- Docker dan Docker Compose sudah terinstall
- Setup n8n-production sudah berjalan
- Domain name (optional, untuk production)

## 📁 File Structure
```
n8n-production/
├── docker-compose.yml          # Main compose file (sudah ada)
├── .env                        # Environment variables (sudah ada)
├── deploy-with-n8n.sh          # Deployment script
└── whatscrm/                   # WhatsApp CRM files (akan dibuat)
    ├── Dockerfile
    ├── app.js
    ├── package.json
    └── .env
```

## 🔧 Step-by-Step Deployment

### Opsi 1: Deploy dari GitHub (Recommended)

#### 1. Setup di VPS
```bash
# SSH ke VPS
ssh user@your-vps-ip

# Pindah ke n8n-production directory
cd /path/to/n8n-production

# Download deployment scripts
wget https://raw.githubusercontent.com/edodoyokz/whatscrm/main/deploy-from-github.sh
wget https://raw.githubusercontent.com/edodoyokz/whatscrm/main/update-from-github.sh

# Buat script executable
chmod +x deploy-from-github.sh update-from-github.sh
```

#### 2. Deploy dari GitHub
```bash
# Jalankan deployment script (akan clone dari GitHub)
./deploy-from-github.sh
```

#### 3. Update di masa depan
```bash
# Untuk update aplikasi dari GitHub
./update-from-github.sh
```

### Opsi 2: Upload Archive (Legacy)

#### 1. Upload Files ke VPS
```bash
# Di local machine, compress project
cd /path/to/whatscrm
tar -czf whatscrm.tar.gz .

# Upload ke VPS
scp whatscrm.tar.gz user@your-vps-ip:/tmp/
```

#### 2. Setup di VPS
```bash
# SSH ke VPS
ssh user@your-vps-ip

# Pindah ke n8n-production directory
cd /path/to/n8n-production

# Extract WhatsApp CRM files
tar -xzf /tmp/whatscrm.tar.gz -C ./whatscrm/

# Buat script deployment executable
chmod +x deploy-with-n8n.sh
```

### 3. Configure Environment
```bash
# Edit environment file
nano whatscrm/.env

# Pastikan konfigurasi sesuai dengan n8n-production:
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=your_database_name
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
```

### 4. Deploy
```bash
# Jalankan deployment script
./deploy-with-n8n.sh
```

## 🔍 Verification

### Check Services
```bash
# Lihat status semua services
docker-compose ps

# Lihat logs WhatsApp CRM
docker-compose logs -f whatscrm-ai

# Test API endpoint
curl http://localhost:3000/health
```

### Access URLs
- **WhatsApp CRM**: http://localhost:3000
- **n8n**: http://localhost:5678  
- **Nginx Proxy Manager**: http://localhost:81

## 🛠️ Management Commands

### Start/Stop Services
```bash
# Start semua services
docker-compose up -d

# Stop semua services
docker-compose down

# Restart WhatsApp CRM saja
docker-compose restart whatscrm-ai
```

### View Logs
```bash
# Logs real-time
docker-compose logs -f whatscrm-ai

# Logs dengan limit
docker-compose logs --tail=50 whatscrm-ai
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild dan restart
./deploy-with-n8n.sh
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Docker Build Failed
```bash
# Check Docker daemon
sudo systemctl status docker

# Check disk space
df -h

# Clean Docker cache
docker system prune -a
```

#### 2. Database Connection Error
```bash
# Check PostgreSQL container
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

#### 3. Port Already in Use
```bash
# Check port usage
sudo netstat -tlnp | grep :3000

# Kill process using port
sudo kill -9 <PID>
```

#### 4. Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER whatscrm/
chmod -R 755 whatscrm/
```

### Debug Mode
```bash
# Run in debug mode
docker-compose logs -f whatscrm-ai | grep -i error

# Check container resources
docker stats whatscrm-ai
```

## 📊 Monitoring

### Health Check
```bash
# Manual health check
curl -f http://localhost:3000/health || echo "Service down"

# Check container health
docker-compose ps | grep whatscrm-ai
```

### Resource Usage
```bash
# Monitor resource usage
docker stats --no-stream

# Check disk usage
du -sh whatscrm/logs whatscrm/uploads
```

## 🔒 Security Considerations

### Environment Variables
- ✅ Gunakan strong passwords untuk database
- ✅ Rotate API keys secara berkala
- ✅ Jangan commit .env files ke git
- ✅ Gunakan secrets management untuk production

### Network Security
- ✅ Firewall hanya buka port yang diperlukan
- ✅ Gunakan HTTPS untuk production
- ✅ Restrict access dengan IP whitelist jika perlu

### Container Security
- ✅ Update base images secara berkala
- ✅ Scan images untuk vulnerabilities
- ✅ Monitor container logs untuk suspicious activity

## 📞 Support

Jika mengalami masalah:
1. Check logs: `docker-compose logs whatscrm-ai`
2. Verify configuration: `cat whatscrm/.env`
3. Test connectivity: `curl http://localhost:3000/health`
4. Check resources: `docker stats`

## 🔄 Backup & Recovery

### Backup Data
```bash
# Backup database
docker-compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql

# Backup uploads
tar -czf uploads-backup.tar.gz whatscrm/uploads/

# Backup logs
tar -czf logs-backup.tar.gz whatscrm/logs/
```

### Restore Data
```bash
# Restore database
docker-compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB < backup.sql

# Restore uploads
tar -xzf uploads-backup.tar.gz -C ./
``` 