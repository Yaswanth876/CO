# Backend Setup & Deployment Guide

## 📦 Installation Steps

### 1. Prerequisites Verification

Check that you have all required software:

```bash
# Node.js (v14+)
node --version
npm --version

# PostgreSQL (v12+)
psql --version

# Python 3.8+
python3 --version

# Tesseract OCR
tesseract --version
```

If any are missing, install them:

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install nodejs npm postgresql python3 python3-pip tesseract-ocr
```

**macOS (Homebrew):**
```bash
brew install node postgresql python@3.11 tesseract
```

**Windows:**
- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/download/windows/
- Python: https://www.python.org/downloads/
- Tesseract: https://github.com/UB-Mannheim/tesseract/wiki

---

### 2. Database Setup

**Create PostgreSQL database and user:**

```bash
# Enter PostgreSQL
sudo -u postgres psql

# In PostgreSQL console:
CREATE USER co_user WITH PASSWORD 'secure_password';
CREATE DATABASE co_attainment OWNER co_user;
ALTER ROLE co_user CREATEDB;
\q
```

**Test connection:**
```bash
psql -h localhost -U co_user -d co_attainment
```

---

### 3. Backend Setup

```bash
# Navigate to backend
cd /path/to/CO/backend

# Install Node dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your editor
```

**Sample `.env`:**
```
DATABASE_URL=postgresql://co_user:secure_password@localhost:5432/co_attainment
PORT=5000
NODE_ENV=development
JWT_SECRET=your_very_secure_random_string_here_at_least_32_chars
UPLOADS_DIR=/home/user/co_uploads
OUTPUTS_DIR=/home/user/co_outputs
PYTHON_STAGE_DIR=./python
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

**Create upload/output directories:**
```bash
mkdir -p /home/user/co_uploads
mkdir -p /home/user/co_outputs
chmod 755 /home/user/co_uploads
chmod 755 /home/user/co_outputs
```

**Install Python dependencies:**
```bash
# In Python backend directory
cd /path/to/CO/backend
pip3 install -r requirements.txt
```

---

### 4. Database Migration

```bash
# Create tables using SQL schema
psql -h localhost -U co_user -d co_attainment < database.sql

# Verify tables created:
psql -h localhost -U co_user -d co_attainment -c "\dt"
```

---

### 5. Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

**Expected output:**
```
✓ Database synchronized
✓ Server running on port 5000
✓ Mode: development
✓ Uploads dir: /home/user/co_uploads
✓ Outputs dir: /home/user/co_outputs
✓ Python stage dir: ./python
```

**Test health endpoint:**
```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-04-09T...",
  "uptime": 12.345,
  "database": "co_attainment"
}
```

---

## 🔌 Frontend Integration

### Register Script

Create React/Vue integration script for API calls:

```javascript
// api.js
const API_BASE = 'http://localhost:5000/api';

class CoAttainmentAPI {
  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  async register(email, password, fullName) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName })
    });
    return res.json();
  }

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('auth_token', data.token);
    }
    return data;
  }

  async getSubjects() {
    return this.fetch(`${API_BASE}/subjects`);
  }

  async createSubject(subjectCode, subjectName, academicYear, semester) {
    return this.fetch(`${API_BASE}/subjects`, {
      method: 'POST',
      body: { subject_code: subjectCode, subject_name: subjectName, academic_year: academicYear, semester }
    });
  }

  async uploadFile(subjectId, fileType, file) {
    const formData = new FormData();
    formData.append('subject_id', subjectId);
    formData.append('file_type', fileType);
    formData.append('file', file);

    const endpoint = fileType.startsWith('CAT1') ? '/phase1' : fileType.startsWith('CAT2') || fileType.startsWith('ASS') ? '/phase2' : '/phase3';
    const url = fileType === 'TERMINAL' ? `${API_BASE}${endpoint}/upload-terminal` :
                fileType === 'CAT1_QP' ? `${API_BASE}${endpoint}/upload-qp` :
                fileType === 'CAT1_MARKS' ? `${API_BASE}${endpoint}/upload-marks` :
                `${API_BASE}${endpoint}/upload`;

    return this.fetch(url, {
      method: 'POST',
      body: formData,
      skipJsonHeader: true
    });
  }

  async async fetch(url, options = {}) {
    const headers = {
      ...(!options.skipJsonHead && { 'Content-Type': 'application/json' }),
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options.headers
    };

    const res = await fetch(url, {
      ...options,
      headers,
      ...(options.body && !options.skipJsonHeader && { body: JSON.stringify(options.body) })
    });

    if (res.status === 401) {
      this.token = null;
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }

    return res.json();
  }
}

export default new CoAttainmentAPI();
```

---

## 📊 Monitoring

### Check Server Status

```bash
# Check if server is running
curl -s http://localhost:5000/api/health | jq .

# Watch logs in development
npm run dev

# View database size
psql -h localhost -U co_user -d co_attainment -c "SELECT pg_size_pretty(pg_database_size('co_attainment'));"

# List subjects
psql -h localhost -U co_user -d co_attainment -c "SELECT * FROM subjects;"
```

### Monitor Disk Usage

```bash
# Check upload/output directories
du -sh /home/user/co_uploads
du -sh /home/user/co_outputs

# Clean up old files
find /home/user/co_uploads -type f -mtime +30 -delete  # Delete files older than 30 days
```

---

## 🚀 Production Deployment

### 1. Update Environment

```bash
# .env for production
NODE_ENV=production
DATABASE_URL=postgresql://co_user:STRONG_PASSWORD@db.server.com:5432/co_attainment
JWT_SECRET=generate_long_random_string_with_openssl_rand_base64_32
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

Generate JWT secret:
```bash
openssl rand -base64 32
```

### 2. Use PM2 for Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Start app with PM2
pm2 start server.js --name "co-attainment-backend"

# Enable auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs co-attainment-backend
```

### 3. Nginx Reverse Proxy

**`/etc/nginx/sites-available/co-attainment`:**
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/co-attainment /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.yourdomain.com
```

### 5. Database Backup

**Automated daily backup script:**

```bash
#!/bin/bash
# /home/user/backup_db.sh

BACKUP_DIR="/home/user/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="co_attainment"
DB_USER="co_user"

mkdir -p $BACKUP_DIR

pg_dump -h localhost -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/co_attainment_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
```

**Add to crontab (daily at 2 AM):**
```bash
0 2 * * * /home/user/backup_db.sh
```

---

## 🐛 Troubleshooting

### Issue: Database connection failed

**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify credentials in .env
psql -h localhost -U co_user -d co_attainment

# Check database exists
psql -h localhost -U co_user -l | grep co_attainment
```

### Issue: Python scripts not found

**Solution:**
```bash
# Verify Python stage scripts exist
ls -la ./python/stage*.py

# Update PYTHON_STAGE_DIR in .env
PYTHON_STAGE_DIR=/full/path/to/python

# Test Python script directly
python3 ./python/stage1_qp.py '{"docx_path": "test.docx", "output_path": "out.xlsx"}'
```

### Issue: File upload fails

**Solution:**
```bash
# Check directory permissions
chmod 755 /home/user/co_uploads /home/user/co_outputs

# Check disk space
df -h

# Check Node process permissions
ps aux | grep "node"
```

### Issue: Port 5000 already in use

**Solution:**
```bash
# Find process using port
lsof -i :5000

# Kill it
kill -9 <PID>

# Or use different port
PORT=5001 npm start
```

---

## 📋 Deployment Checklist

- [ ] PostgreSQL installed and running
- [ ] Database and user created
- [ ] .env configured with production values
- [ ] JWT_SECRET generated (strong)
- [ ] CORS_ORIGIN set to frontend domain
- [ ] Upload/output directories created and writeable
- [ ] Python scripts accessible
- [ ] Tesseract OCR installed
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Nginx reverse proxy configured
- [ ] PM2 or systemd service configured
- [ ] Database backups automated
- [ ] Monitoring set up (PM2, logs)
- [ ] Firewall rules configured (port 443, 80)
- [ ] Performance tested with sample data

---

## 📞 Quick Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

# Database
psql -h localhost -U co_user -d co_attainment

# Check logs
tail -f logs/application.log

# Restart with PM2
pm2 restart co-attainment-backend

# Test Python stage
python3 ./python/stage1_qp.py '{"docx_path": "...", "output_path": "..."}'

# View disk usage
du -sh /home/user/co_uploads

#Clear old files
find /home/user/co_uploads -type f -mtime +7 -delete
```
