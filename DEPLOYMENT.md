# PrimePal Deployment Guide (DigitalOcean)

## Quick Start (3-Hour Production Deployment)

### Prerequisites
- DigitalOcean account
- Docker installed locally
- All environment variables from `.env` file

### Step 1: Build and Test Locally (5 min)

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Start Redis + Backend with docker-compose
docker-compose up -d

# Test health endpoint
curl http://localhost:8000/health

# Test a mission endpoint
curl -X GET http://localhost:8000/api/v1/missions/daily \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
```

### Step 2: Create DigitalOcean Droplet (10 min)

1. Create a new Ubuntu 22.04 Droplet
   - Choose $6-12/month basic plan
   - Select datacenter closest to users
   - Add SSH key

2. SSH into droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

3. Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### Step 3: Deploy Backend (15 min)

1. Clone repository:
```bash
cd /opt
git clone https://github.com/YOUR_ORG/primepal.git
cd primepal
```

2. Create `.env` file with production values:
```bash
cat > backend/.env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-key
OPENAI_API_KEY=sk-...
STUDENT_JWT_SECRET=your-secret-key-here
DATABASE_URL=postgresql://...
APP_ENV=production
EOF
```

3. Build and run with docker-compose:
```bash
docker-compose up -d
```

4. Verify services:
```bash
docker-compose ps
curl http://localhost:8000/health
redis-cli ping
```

### Step 4: Configure Reverse Proxy (10 min)

Install and configure Nginx:

```bash
apt-get update && apt-get install -y nginx

# Create Nginx config
cat > /etc/nginx/sites-available/primepal << 'EOF'
upstream primepal_backend {
    server localhost:8000;
}

server {
    listen 80;
    server_name your-domain.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # API proxy
    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://primepal_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://primepal_backend;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/primepal /etc/nginx/sites-enabled/
systemctl restart nginx
```

### Step 5: SSL Certificate (5 min)

Install Let's Encrypt SSL:

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

### Step 6: Monitor & Scale (Production)

Check logs:
```bash
docker-compose logs -f backend
docker-compose logs -f redis
```

Monitor performance:
```bash
docker stats
```

Scale workers (if needed):
```bash
# In backend container
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 8
```

## Cost Estimate (Monthly)

| Component | Cost |
|-----------|------|
| DigitalOcean Droplet (6GB RAM) | $12/mo |
| Supabase (free tier) | $0 |
| Domain (optional) | $12/year |
| **Total** | **~$12/month** |

## Performance Targets

After deployment, you should see:
- API response times: **< 500ms** (cached endpoints), **< 2s** (LLM endpoints)
- Page load times: **< 3s** (student home)
- Support for **150-200 concurrent users**

## Monitoring Dashboard

Create health checks for uptime monitoring:
```bash
# Uptimerobot, StatusPage, or similar
GET https://your-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "primepal-api"
}
```

## Troubleshooting

### Backend not responding
```bash
docker-compose logs backend
docker-compose restart backend
```

### Redis connection error
```bash
docker-compose restart redis
redis-cli ping  # Should return PONG
```

### High response times
```bash
# Check database slow queries
# Check OpenAI API status
# Check cache hit rates in logs
```

### Rate limiting too strict
Edit `/etc/nginx/sites-available/primepal` and adjust limits.
