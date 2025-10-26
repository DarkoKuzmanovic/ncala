# App.quz.ma Publishing Guide

> A comprehensive guide for building and deploying projects to app.quz.ma using Nginx and PM2

## Table of Contents

1. [Project Structure Requirements](#project-structure-requirements)
2. [Port Allocation](#port-allocation)
3. [Project Setup Checklist](#project-setup-checklist)
4. [Node.js Projects (PM2)](#nodejs-projects-pm2)
5. [Python Projects (PM2/Systemd)](#python-projects-pm2systemd)
6. [Nginx Configuration](#nginx-configuration)
7. [Environment Variables](#environment-variables)
8. [Git Workflow](#git-workflow)
9. [Deployment Process](#deployment-process)
10. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Project Structure Requirements

All projects under `/var/www/app.quz.ma/` should follow this structure:

```
/var/www/app.quz.ma/
├── index.html                    # Landing page for app.quz.ma
├── PUBLISHING_GUIDE.md          # This file
├── project-name/                # Your project directory
│   ├── .env.example             # Environment variables template
│   ├── .env                     # Actual env vars (git-ignored)
│   ├── .gitignore
│   ├── README.md                # Project-specific docs
│   ├── start.sh                 # Startup script
│   ├── ecosystem.config.js      # PM2 config (Node.js)
│   ├── updateGuide.md           # Deployment instructions (optional)
│   └── [project files]
```

### Mandatory Files

Every project MUST include:

- `.env.example` - Template for required environment variables
- `.gitignore` - Exclude `.env`, `node_modules/`, `venv/`, etc.
- `README.md` - Project description and local dev setup
- `start.sh` - Startup script for the application

---

## Port Allocation

**Strategy:** Each project runs on its own port and is proxied through Nginx.

### Port Registry

Maintain this list as you add projects:

| Port | Project Name   | Type       | Status |
|------|---------------|------------|--------|
| 8000 | verbatim-ai   | Python     | Active |
| 8001 | [available]   |            |        |
| 8002 | [available]   |            |        |
| 8003 | [available]   |            |        |
| 8004 | [available]   |            |        |
| 8005 | [available]   |            |        |

**Rules:**
- Choose next available port in sequence
- Update this table when deploying
- Avoid ports below 8000 (system reserved)
- Test port availability: `sudo lsof -i :8001`

---

## Project Setup Checklist

Use this checklist when starting a new project:

### Phase 1: Initial Planning

- [ ] Choose a unique project name (lowercase, hyphens for spaces)
- [ ] Assign an available port number
- [ ] Decide on tech stack (Node.js, Python, etc.)
- [ ] Plan the URL path: `https://app.quz.ma/your-project-name/`

### Phase 2: Project Creation

- [ ] Create project directory: `mkdir /var/www/app.quz.ma/project-name`
- [ ] Initialize git repo: `git init`
- [ ] Create `.gitignore` with appropriate exclusions
- [ ] Create `.env.example` with all required variables
- [ ] Create actual `.env` file (never commit!)
- [ ] Create `README.md` with project description
- [ ] Create `start.sh` with startup commands

### Phase 3: Application Setup

**For Node.js:**
- [ ] Create `ecosystem.config.js` for PM2
- [ ] Add health check endpoint at `/health`
- [ ] Configure to listen on assigned port
- [ ] Set up path prefix support (e.g., `/project-name/`)

**For Python:**
- [ ] Create `requirements.txt`
- [ ] Set up virtual environment
- [ ] Add health check endpoint at `/health`
- [ ] Configure to listen on assigned port
- [ ] Create systemd service OR PM2 config

### Phase 4: Nginx Setup

- [ ] Create Nginx location block in `/etc/nginx/sites-available/app.quz.ma`
- [ ] Test config: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`

### Phase 5: GitHub Setup

- [ ] Create GitHub repository
- [ ] Add remote: `git remote add origin git@github.com:username/project.git`
- [ ] Push initial commit
- [ ] Set up SSH key if needed

### Phase 6: Deployment

- [ ] Start application (PM2 or systemd)
- [ ] Test local endpoint: `curl http://localhost:PORT/health`
- [ ] Test public endpoint: `curl https://app.quz.ma/project-name/health`
- [ ] Verify logs
- [ ] Update port registry in this document

---

## Node.js Projects (PM2)

### Initial Setup

```bash
# 1. Create project directory
cd /var/www/app.quz.ma
mkdir my-node-app && cd my-node-app

# 2. Initialize Node.js project
npm init -y

# 3. Install dependencies
npm install express dotenv
npm install -D nodemon

# 4. Install PM2 globally (if not already installed)
sudo npm install -g pm2
```

### Project Structure

```
my-node-app/
├── ecosystem.config.js    # PM2 configuration
├── start.sh              # Startup script
├── .env.example
├── .env
├── package.json
├── server.js             # Entry point
└── src/
    └── [your code]
```

### ecosystem.config.js Template

```javascript
module.exports = {
  apps: [{
    name: 'my-node-app',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 8001  // Your assigned port
    },
    error_file: '/tmp/my-node-app-error.log',
    out_file: '/tmp/my-node-app-out.log',
    log_file: '/tmp/my-node-app-combined.log',
    time: true
  }]
};
```

### server.js Template

```javascript
require('dotenv').config();
const express = require('express');
const app = express();

const PORT = process.env.PORT || 8001;
const BASE_PATH = process.env.BASE_PATH || '/my-node-app';

// Middleware
app.use(express.json());

// Health check endpoint (REQUIRED)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    app: 'my-node-app'
  });
});

// Your routes here
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to My Node App' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### start.sh for Node.js

```bash
#!/bin/bash
cd /var/www/app.quz.ma/my-node-app
pm2 start ecosystem.config.js
pm2 save
```

### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js

# Stop application
pm2 stop my-node-app

# Restart application
pm2 restart my-node-app

# View logs
pm2 logs my-node-app

# View status
pm2 status

# Monitor
pm2 monit

# Save PM2 process list (for auto-restart on reboot)
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it provides
```

### Deployment Workflow (Node.js)

```bash
# On production server
cd /var/www/app.quz.ma/my-node-app

# Pull latest changes
git pull origin main

# Install/update dependencies
npm install

# Restart with PM2
pm2 restart my-node-app

# Or reload with zero-downtime
pm2 reload my-node-app

# Verify
curl http://localhost:8001/health
curl https://app.quz.ma/my-node-app/health
```

---

## Python Projects (PM2/Systemd)

### Initial Setup

```bash
# 1. Create project directory
cd /var/www/app.quz.ma
mkdir my-python-app && cd my-python-app

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install framework (FastAPI example)
pip install fastapi uvicorn python-dotenv

# 4. Create requirements.txt
pip freeze > requirements.txt
```

### Project Structure

```
my-python-app/
├── venv/                 # Virtual environment (git-ignored)
├── start.sh             # Startup script
├── .env.example
├── .env
├── requirements.txt
├── main.py              # Entry point
└── app/
    └── [your code]
```

### main.py Template (FastAPI)

```python
import os
from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

app = FastAPI(
    title="My Python App",
    docs_url="/docs",
    redoc_url="/redoc",
    root_path=os.getenv("BASE_PATH", "")
)

# Health check endpoint (REQUIRED)
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "my-python-app"
    }

# Your routes here
@app.get("/")
async def root():
    return {"message": "Welcome to My Python App"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

### Option 1: Using Systemd (Recommended for Python)

#### start.sh for Systemd

```bash
#!/bin/bash
cd /var/www/app.quz.ma/my-python-app
source venv/bin/activate
exec uvicorn main:app --host 0.0.0.0 --port 8002
```

#### Systemd Service File

Create `/etc/systemd/system/my-python-app.service`:

```ini
[Unit]
Description=My Python App - FastAPI Application
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/var/www/app.quz.ma/my-python-app
Environment="PATH=/var/www/app.quz.ma/my-python-app/venv/bin"
EnvironmentFile=/var/www/app.quz.ma/my-python-app/.env
ExecStart=/var/www/app.quz.ma/my-python-app/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8002
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Systemd Commands

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable my-python-app
sudo systemctl start my-python-app

# Check status
sudo systemctl status my-python-app

# View logs
sudo journalctl -u my-python-app -f

# Restart after updates
sudo systemctl restart my-python-app

# Stop service
sudo systemctl stop my-python-app
```

### Option 2: Using PM2 for Python

#### ecosystem.config.js for Python

```javascript
module.exports = {
  apps: [{
    name: 'my-python-app',
    script: 'start.sh',
    interpreter: '/bin/bash',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '/tmp/my-python-app-error.log',
    out_file: '/tmp/my-python-app-out.log',
    log_file: '/tmp/my-python-app-combined.log',
    time: true
  }]
};
```

#### PM2 Commands for Python

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Or start the script directly
pm2 start start.sh --name my-python-app --interpreter bash

# Other commands same as Node.js section
pm2 restart my-python-app
pm2 logs my-python-app
pm2 status
```

### Deployment Workflow (Python)

```bash
# On production server
cd /var/www/app.quz.ma/my-python-app

# Pull latest changes
git pull origin main

# Activate venv and update dependencies
source venv/bin/activate
pip install -r requirements.txt

# Restart service
# If using systemd:
sudo systemctl restart my-python-app

# If using PM2:
pm2 restart my-python-app

# Verify
curl http://localhost:8002/health
curl https://app.quz.ma/my-python-app/health
```

---

## Nginx Configuration

### Adding a New Project Location

Edit `/etc/nginx/sites-available/app.quz.ma`:

```bash
sudo nano /etc/nginx/sites-available/app.quz.ma
```

Add a new location block:

```nginx
# Proxy to your app at /project-name
location /project-name/ {
    proxy_pass http://localhost:8001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Adjust timeouts if needed
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# If your app serves static files
location /project-name/static/ {
    proxy_pass http://localhost:8001/static/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

### Test and Reload Nginx

```bash
# Test configuration
sudo nginx -t

# Reload if test passes
sudo systemctl reload nginx

# Check nginx status
sudo systemctl status nginx
```

### Complete Nginx Config Template

Here's the full structure of `/etc/nginx/sites-available/app.quz.ma`:

```nginx
server {
    server_name app.quz.ma;
    root /var/www/app.quz.ma;
    index index.html index.htm;

    # Project 1: verbatim-ai (Python, port 8000)
    location /verbatim-ai/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Project 2: my-node-app (Node.js, port 8001)
    location /my-node-app/ {
        proxy_pass http://localhost:8001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Add more projects here...

    # Serve static files from root (landing page)
    location / {
        try_files $uri $uri/ =404;
    }

    # Logs
    access_log /var/log/nginx/app.quz.ma-access.log;
    error_log /var/log/nginx/app.quz.ma-error.log;

    listen [::]:443 ssl;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/app.quz.ma/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.quz.ma/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = app.quz.ma) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    listen [::]:80;
    server_name app.quz.ma;
    return 404;
}
```

---

## Environment Variables

### .env.example Template

Every project should have a `.env.example` file:

```bash
# Server Configuration
PORT=8001
BASE_PATH=/my-app
NODE_ENV=production

# API Keys
API_KEY=your_api_key_here
SECRET_KEY=your_secret_here

# Database (if applicable)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# External Services
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...

# Feature Flags
ENABLE_ANALYTICS=true
DEBUG_MODE=false
```

### Best Practices

- **Never commit `.env`** - Add to `.gitignore`
- **Always provide `.env.example`** - Template for required vars
- **Document each variable** - Comments explaining purpose
- **Use descriptive names** - `DATABASE_URL` not `DB`
- **Set sensible defaults** - In code when possible
- **Rotate secrets regularly** - API keys, passwords
- **Use different values per environment** - dev vs prod

### Loading Environment Variables

**Node.js:**
```javascript
require('dotenv').config();
const port = process.env.PORT || 8001;
```

**Python:**
```python
from dotenv import load_dotenv
import os

load_dotenv()
port = int(os.getenv("PORT", 8001))
```

---

## Git Workflow

### Initial Repository Setup

```bash
# 1. Initialize git in project directory
cd /var/www/app.quz.ma/my-app
git init

# 2. Create .gitignore
cat > .gitignore << EOF
# Environment
.env
*.env
!.env.example

# Node.js
node_modules/
npm-debug.log
package-lock.json

# Python
venv/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python

# Logs
*.log
logs/
/tmp/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
EOF

# 3. Initial commit
git add .
git commit -m "Initial commit: project setup"

# 4. Create GitHub repo and add remote
git remote add origin git@github.com:username/my-app.git
git branch -M main
git push -u origin main
```

### Development Workflow

**On Local Machine:**

```bash
# 1. Make changes
# 2. Test locally
# 3. Commit changes
git add .
git commit -m "Descriptive commit message"

# 4. Push to GitHub
git push origin main
```

**On Production Server:**

```bash
# 1. Navigate to project
cd /var/www/app.quz.ma/my-app

# 2. Pull latest changes
git pull origin main

# 3. Install/update dependencies
# Node.js:
npm install
# Python:
source venv/bin/activate && pip install -r requirements.txt

# 4. Restart application
# PM2:
pm2 restart my-app
# Systemd:
sudo systemctl restart my-app

# 5. Verify deployment
curl http://localhost:8001/health
curl https://app.quz.ma/my-app/health
```

### Automated Update Script

Create `update.sh` in your project:

```bash
#!/bin/bash
set -e

PROJECT_NAME="my-app"
PROJECT_DIR="/var/www/app.quz.ma/$PROJECT_NAME"
PORT=8001

echo "🚀 Starting deployment for $PROJECT_NAME..."

# Navigate to project
cd $PROJECT_DIR

# Stash any local changes
echo "📦 Stashing local changes..."
git stash

# Pull latest code
echo "⬇️  Pulling latest code..."
git pull origin main

# Check if this is a Node.js project
if [ -f "package.json" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Check if this is a Python project
if [ -f "requirements.txt" ]; then
    echo "🐍 Installing Python dependencies..."
    source venv/bin/activate
    pip install -r requirements.txt
fi

# Restart application
echo "🔄 Restarting application..."

# Try PM2 first
if command -v pm2 &> /dev/null && pm2 list | grep -q $PROJECT_NAME; then
    pm2 restart $PROJECT_NAME
    echo "✅ Restarted with PM2"
# Then try systemd
elif systemctl list-unit-files | grep -q "${PROJECT_NAME}.service"; then
    sudo systemctl restart $PROJECT_NAME
    echo "✅ Restarted with systemd"
else
    echo "❌ No process manager found!"
    exit 1
fi

# Health check
echo "🏥 Running health check..."
sleep 3

if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
    echo "✅ Local health check passed!"
else
    echo "❌ Local health check failed!"
    exit 1
fi

if curl -f https://app.quz.ma/$PROJECT_NAME/health > /dev/null 2>&1; then
    echo "✅ Public health check passed!"
else
    echo "⚠️  Public health check failed - check Nginx config"
fi

echo "🎉 Deployment complete!"
```

Make it executable:

```bash
chmod +x update.sh
```

---

## Deployment Process

### First-Time Deployment Checklist

```bash
# 1. Create project directory
mkdir /var/www/app.quz.ma/my-app
cd /var/www/app.quz.ma/my-app

# 2. Clone or initialize git
git clone git@github.com:username/my-app.git .
# OR
git init

# 3. Set up environment
cp .env.example .env
nano .env  # Fill in actual values

# 4. Install dependencies
# Node.js:
npm install
# Python:
python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# 5. Test locally
# Node.js:
npm start
# Python:
bash start.sh
# Test: curl http://localhost:8001/health

# 6. Set up process manager
# PM2:
pm2 start ecosystem.config.js
pm2 save
# Systemd:
sudo cp my-app.service /etc/systemd/system/
sudo systemctl enable my-app
sudo systemctl start my-app

# 7. Configure Nginx
sudo nano /etc/nginx/sites-available/app.quz.ma
# Add location block for /my-app/
sudo nginx -t
sudo systemctl reload nginx

# 8. Test public endpoint
curl https://app.quz.ma/my-app/health

# 9. Update port registry in PUBLISHING_GUIDE.md
```

### Routine Update Process

```bash
# Use automated script
cd /var/www/app.quz.ma/my-app
./update.sh

# OR manual process:
git pull origin main
npm install  # or pip install -r requirements.txt
pm2 restart my-app  # or sudo systemctl restart my-app
curl https://app.quz.ma/my-app/health
```

---

## Monitoring & Troubleshooting

### Health Checks

Every app should have a `/health` endpoint:

```bash
# Check specific app
curl http://localhost:8001/health
curl https://app.quz.ma/my-app/health

# Check all apps
curl https://app.quz.ma/verbatim-ai/health
curl https://app.quz.ma/my-node-app/health
# Add more as needed
```

### Viewing Logs

**PM2:**
```bash
pm2 logs my-app           # All logs
pm2 logs my-app --lines 100  # Last 100 lines
pm2 logs my-app --err     # Only errors
pm2 flush my-app          # Clear logs
```

**Systemd:**
```bash
sudo journalctl -u my-app -f              # Follow logs
sudo journalctl -u my-app --since "1 hour ago"
sudo journalctl -u my-app -n 100          # Last 100 lines
```

**Nginx:**
```bash
# Access logs
tail -f /var/log/nginx/app.quz.ma-access.log

# Error logs
tail -f /var/log/nginx/app.quz.ma-error.log

# Filter for specific app
grep "/my-app/" /var/log/nginx/app.quz.ma-access.log
```

### Common Issues

#### 502 Bad Gateway

**Cause:** Application not running or wrong port

**Solution:**
```bash
# Check if app is running
ps aux | grep my-app
curl http://localhost:8001/health

# Restart app
pm2 restart my-app
# or
sudo systemctl restart my-app

# Check nginx config
sudo nginx -t
```

#### 404 Not Found

**Cause:** Nginx location block missing or incorrect

**Solution:**
```bash
# Check nginx config
sudo nano /etc/nginx/sites-available/app.quz.ma

# Verify location block exists for your app
# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

#### Port Already in Use

**Cause:** Another process using your assigned port

**Solution:**
```bash
# Find what's using the port
sudo lsof -i :8001

# Kill the process
kill -9 <PID>

# Or use a different port and update nginx config
```

#### Application Won't Start

**Cause:** Missing dependencies, wrong environment, syntax errors

**Solution:**
```bash
# Check logs
pm2 logs my-app --err
# or
sudo journalctl -u my-app -n 50

# Verify dependencies
npm install  # Node.js
pip install -r requirements.txt  # Python

# Check .env file
cat .env.example
nano .env

# Try running manually
node server.js  # Node.js
source venv/bin/activate && python main.py  # Python
```

#### High Memory Usage

**Solution:**
```bash
# Check memory usage
pm2 monit

# Set memory limit in ecosystem.config.js
max_memory_restart: '500M'

# Restart app
pm2 restart my-app
```

### Monitoring Commands

```bash
# PM2 dashboard
pm2 monit

# List all PM2 processes
pm2 list

# System resource usage
htop

# Disk usage
df -h

# Check listening ports
sudo netstat -tulpn | grep LISTEN

# Nginx status
sudo systemctl status nginx

# Check all running apps
curl https://app.quz.ma/verbatim-ai/health && echo " - verbatim-ai OK"
curl https://app.quz.ma/my-app/health && echo " - my-app OK"
```

---

## Quick Reference

### Port Registry

| Port | Project Name   | Type       | Status |
|------|---------------|------------|--------|
| 8000 | verbatim-ai   | Python     | Active |
| 8001 | [next]        |            |        |

### Essential Commands

```bash
# PM2
pm2 start ecosystem.config.js
pm2 restart <app-name>
pm2 logs <app-name>
pm2 monit

# Systemd
sudo systemctl restart <app-name>
sudo systemctl status <app-name>
sudo journalctl -u <app-name> -f

# Nginx
sudo nginx -t
sudo systemctl reload nginx
tail -f /var/log/nginx/app.quz.ma-error.log

# Git
git pull origin main
git add . && git commit -m "message" && git push

# Health checks
curl http://localhost:PORT/health
curl https://app.quz.ma/app-name/health
```

### File Locations

```
/var/www/app.quz.ma/              # All projects
/etc/nginx/sites-available/       # Nginx configs
/etc/systemd/system/              # Systemd services
/var/log/nginx/                   # Nginx logs
/tmp/                             # PM2 logs (if configured)
```

---

## Best Practices Summary

1. **Always include a health check endpoint** at `/health`
2. **Use .env for configuration** - never hardcode secrets
3. **Maintain the port registry** - avoid conflicts
4. **Test locally first** before deploying
5. **Use process managers** (PM2/systemd) for reliability
6. **Monitor logs regularly** - catch issues early
7. **Keep dependencies updated** but test first
8. **Document project-specific quirks** in project README
9. **Use git for everything** - even config changes
10. **Backup before major changes** - databases, .env files

---

## Need Help?

- **Nginx docs:** https://nginx.org/en/docs/
- **PM2 docs:** https://pm2.keymetrics.io/docs/
- **Systemd tutorial:** `man systemd.service`
- **Git reference:** https://git-scm.com/docs

**Check project-specific documentation:**
- Each project may have its own `updateGuide.md`
- Check `README.md` for local development setup
- Review `.env.example` for required variables

---

**Last Updated:** 2025-10-26
**Maintained by:** Project Team
