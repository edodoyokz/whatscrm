# 🚀 Natural AI Assistant - VPS Deployment Guide

## 📋 Daftar Isi
1. [Persiapan VPS](#persiapan-vps)
2. [Instalasi Dependencies](#instalasi-dependencies)
3. [Konfigurasi Environment](#konfigurasi-environment)
4. [Setup Database](#setup-database)
5. [SSL & Security](#ssl--security)
6. [Deploy Application](#deploy-application)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## 🖥️ PERSIAPAN VPS

### **Spesifikasi Minimum**
- **OS**: Ubuntu 20.04/22.04 LTS
- **RAM**: 4GB (8GB recommended untuk production)
- **CPU**: 2 cores (4 cores recommended)
- **Storage**: 50GB SSD
- **Network**: 1Gbps connection

### **Provider VPS yang Direkomendasikan**
- **DigitalOcean**: Droplet 4GB/2CPU ($24/month)
- **Linode**: Linode 4GB ($24/month)
- **Vultr**: Cloud Compute 4GB ($24/month)
- **AWS Lightsail**: 4GB instance ($20/month)

---

## 🔧 INSTALASI DEPENDENCIES

### **1. Update System**
```bash
sudo apt update && sudo apt upgrade -y
```

### **2. Install Node.js 18+**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### **3. Install PM2 Process Manager**
```bash
sudo npm install -g pm2
```

### **4. Install Database (MySQL 8.0)**
```bash
sudo apt install mysql-server -y
sudo mysql_secure_installation
```

### **5. Install Nginx Web Server**
```bash
sudo apt install nginx -y
```

### **6. Install SSL Certificate (Let's Encrypt)**
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### **7. Install Additional Tools**
```bash
sudo apt install git curl wget unzip -y
```

---

## 🔐 KONFIGURASI ENVIRONMENT

### **1. Clone Repository**
```bash
cd /var/www
sudo git clone [YOUR_REPOSITORY_URL] natural-ai-assistant
cd natural-ai-assistant
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Create Environment File**
```bash
cp .env.example .env
sudo nano .env
```

### **4. Environment Variables Configuration**
```env
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_USER=natural_ai
DB_PASSWORD=your_secure_password
DB_NAME=natural_ai_db
DB_PORT=3306

# AI Provider Keys
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# Security Configuration
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret_key

# Google Sheets Configuration
GOOGLE_APPLICATION_CREDENTIALS=/var/www/natural-ai-assistant/config/google-credentials.json

# WhatsApp Configuration
WHATSAPP_WEBHOOK_URL=https://yourdomain.com/webhook
WHATSAPP_API_KEY=your_whatsapp_api_key

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

---

## 🗄️ SETUP DATABASE

### **1. Create Database & User**
```bash
sudo mysql -u root
```

```sql
CREATE DATABASE natural_ai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'natural_ai'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON natural_ai_db.* TO 'natural_ai'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### **2. Import Database Schema**
```bash
mysql -u natural_ai -p natural_ai_db < database/schema.sql
```

### **3. Optimize MySQL Configuration**
```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add these configurations:
```ini
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
query_cache_size = 64M
query_cache_type = 1
```

### **4. Restart MySQL**
```bash
sudo systemctl restart mysql
```

---

## 🔒 SSL & SECURITY

### **1. Configure Firewall**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

### **2. Setup SSL Certificate**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### **3. Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/natural-ai-assistant
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **4. Enable Nginx Site**
```bash
sudo ln -s /etc/nginx/sites-available/natural-ai-assistant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🚀 DEPLOY APPLICATION

### **1. Build Application**
```bash
npm run build
```

### **2. Start with PM2**
```bash
# Start application
pm2 start server.js --name "natural-ai-assistant"

# Save PM2 configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

### **3. PM2 Configuration File**
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'natural-ai-assistant',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 8000,
    kill_timeout: 5000
  }]
};
```

### **4. Start with PM2 Config**
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## 📊 MONITORING & MAINTENANCE

### **1. PM2 Monitoring**
```bash
pm2 monit
pm2 logs
pm2 status
```

### **2. Log Rotation**
```bash
sudo nano /etc/logrotate.d/pm2
```

```bash
/var/www/natural-ai-assistant/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### **3. Health Check Script**
```bash
nano health-check.sh
```

```bash
#!/bin/bash
# Health check script
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ $