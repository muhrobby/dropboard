# Docker Deployment Guide

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher
- External PostgreSQL database (already configured)

---

## ⚠️ CRITICAL FIXES APPLIED (Feb 2026)

**All production deployment issues have been fixed:**

✅ Login redirect loop fixed (Better Auth `trustedOrigins`)  
✅ Mobile navigation paths corrected  
✅ Dashboard auth guard implemented  
✅ Password validation matched (12 chars)  
✅ Upload volume configured  
✅ Environment variables documented  

**Build status**: 92 tests passing ✅  
**Next.js build**: Clean ✅

---

## Quick Start

### 1. Setup Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and update ALL values below
```

**CRITICAL**: The following variables **MUST** use your **public domain** (not localhost) in production:

```bash
# Auth - MUST BE PUBLIC URL (https://your-domain.com)
BETTER_AUTH_URL=https://dropboard.yourdomain.com
NEXT_PUBLIC_APP_URL=https://dropboard.yourdomain.com
NEXT_PUBLIC_ALLOWED_ORIGINS=https://dropboard.yourdomain.com

# Generate secrets
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
SIGNED_URL_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -hex 20)

# Database (external PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# File upload
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_SIZE_MB=20

# Application
APP_PORT=3004
NODE_ENV=production
```

### 2. Create Network (Required)

```bash
# Create the external network first
docker network create prod_net
```

### 3. Build and Start Containers

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Check service status
docker-compose ps
```

### 4. Access the Application

- Application: https://yourdomain.com (via reverse proxy)
- Direct access: http://localhost:3004
- API Health Check: http://localhost:3004/api/health

---

## Docker Commands

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### View Logs

```bash
# All services
docker-compose logs -f

# App service
docker-compose logs -f app

# Last 100 lines
docker-compose logs -f --tail=100 app
```

### Rebuild Container

```bash
# After code changes
docker-compose up -d --build app

# Force rebuild (no cache)
docker-compose build --no-cache app
docker-compose up -d app
```

### Execute Commands in Container

```bash
# Access app container
docker-compose exec app sh

# Check uploads directory
docker-compose exec app ls -la /app/uploads

# Check environment
docker-compose exec app env | grep BETTER_AUTH
```

---

## Resource Limits

The application has pre-configured resource limits:

### Application Container
- **CPU Limit**: 2 cores
- **Memory Limit**: 1GB
- **CPU Reservation**: 0.5 cores
- **Memory Reservation**: 256MB

To adjust these limits, edit the `deploy.resources` section in `docker-compose.yml`.

---

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes | - |
| `BETTER_AUTH_SECRET` | Auth encryption key | ✅ Yes | - |
| `BETTER_AUTH_URL` | **Public-facing URL** | ✅ Yes | - |
| `NEXT_PUBLIC_APP_URL` | **Public-facing URL (build-time)** | ✅ Yes | - |
| `NEXT_PUBLIC_ALLOWED_ORIGINS` | CORS origins (build-time) | ✅ Yes | - |
| `SIGNED_URL_SECRET` | File download URL signing | ✅ Yes | - |
| `CRON_SECRET` | Cron endpoint auth | ✅ Yes | - |
| `APP_PORT` | Container port | No | `3004` |
| `UPLOAD_DIR` | Upload directory | No | `/app/uploads` |
| `MAX_UPLOAD_SIZE_MB` | Upload size limit | No | `20` |
| `NODE_ENV` | Node environment | No | `production` |

### ⚠️ Build-Time vs Runtime Variables

- `NEXT_PUBLIC_*` variables are **build-time** — baked into client JS bundle
- Changing them requires **full rebuild** (`docker-compose build --no-cache`)
- Other variables are **runtime** — can be changed with just restart

---

## Production Deployment with Dokploy

### 1. Set Environment Variables in Dokploy

In Dokploy dashboard → Your app → Environment:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
BETTER_AUTH_SECRET=<generate-with-openssl>
BETTER_AUTH_URL=https://dropboard.yourdomain.com
NEXT_PUBLIC_APP_URL=https://dropboard.yourdomain.com
NEXT_PUBLIC_ALLOWED_ORIGINS=https://dropboard.yourdomain.com
SIGNED_URL_SECRET=<generate-with-openssl>
CRON_SECRET=<generate-with-openssl>
APP_PORT=3004
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_SIZE_MB=20
NODE_ENV=production
```

**CRITICAL**: Replace `dropboard.yourdomain.com` with your actual domain.

### 2. Deploy

1. Push code to git
2. Trigger redeploy in Dokploy
3. Wait for build to complete
4. Check logs for errors

### 3. Verify Deployment

```bash
# Check container health
docker ps | grep dropboard

# Check logs
docker logs dropboard-app -f --tail=100

# Test health endpoint
curl https://dropboard.yourdomain.com/api/health
```

### 4. Test Login Flow

1. Open `https://dropboard.yourdomain.com`
2. Login with existing user
3. Should redirect to `/dashboard` successfully
4. Test all navigation items (Drops, Pinboard, Search, Team, Activity, Settings)
5. Test file upload in Drops

---

## Reverse Proxy Setup (Nginx/Traefik)

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name dropboard.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dropboard.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Better Auth requires these headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Traefik Configuration

```yaml
http:
  routers:
    dropboard:
      rule: "Host(`dropboard.yourdomain.com`)"
      service: dropboard
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

  services:
    dropboard:
      loadBalancer:
        servers:
          - url: "http://localhost:3004"
```

---

## Troubleshooting

### Problem: Login redirect loop

**Symptoms**: After login, redirects back to login page

**Cause**: `BETTER_AUTH_URL` is still `http://localhost:3004`

**Fix**:
1. Set `BETTER_AUTH_URL=https://your-actual-domain.com` in env
2. **Rebuild image**: `docker-compose build --no-cache && docker-compose up -d`
3. Clear browser cookies/cache

### Problem: CORS errors

**Symptoms**: Browser console shows CORS blocked requests

**Cause**: `NEXT_PUBLIC_ALLOWED_ORIGINS` doesn't match request origin

**Fix**:
1. Check actual origin in browser DevTools → Network tab
2. Add it to `NEXT_PUBLIC_ALLOWED_ORIGINS`
3. **Rebuild image** (it's a build-time variable)

### Problem: File upload fails

**Symptoms**: Upload shows error or files don't persist

**Cause**: Volume not mounted or permission issue

**Fix**:
```bash
# Check volume
docker volume ls | grep uploads_data

# Create if missing
docker volume create uploads_data

# Check permissions
docker exec dropboard-app ls -la /app/uploads

# Fix permissions
docker exec dropboard-app chown -R nextjs:nodejs /app/uploads
```

### Problem: Mobile nav not working

**Symptoms**: Bottom navigation shows wrong pages or 404

**Cause**: Browser cache with old JS bundle

**Fix**: Hard refresh browser (`Ctrl+Shift+R` or `Cmd+Shift+R`)

### Problem: Database connection fails

**Cause**: Container can't reach external PostgreSQL

**Fix**:
```bash
# Test connectivity from container
docker exec dropboard-app ping -c 3 <db-host>

# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:port/database
```

### Problem: Environment variable not applying

**For runtime vars** (DATABASE_URL, CRON_SECRET, etc):
```bash
docker-compose restart app
```

**For build-time vars** (NEXT_PUBLIC_*):
```bash
docker-compose build --no-cache app
docker-compose up -d app
```

---

## Health Check

The application includes a health check endpoint:

```bash
curl http://localhost:3004/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

Docker health check runs every 30s:
```bash
# Check health status
docker ps | grep dropboard

# Healthy shows: (healthy)
# Unhealthy shows: (unhealthy)
```

---

## Volumes

### Uploads Volume

Persistent storage for uploaded files:

```bash
# Inspect volume
docker volume inspect uploads_data

# Backup uploads
docker run --rm -v uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup_$(date +%Y%m%d).tar.gz /data

# Restore uploads
docker run --rm -v uploads_data:/data -v $(pwd):/backup alpine tar xzf /backup/uploads_backup_20260207.tar.gz -C /
```

---

## Database Backups

```bash
# Backup database
docker exec dropboard-app pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Or from external host
pg_dump -h <db-host> -U <db-user> -d dropboard_prod > backup_$(date +%Y%m%d).sql

# Restore
psql -h <db-host> -U <db-user> -d dropboard_prod < backup_20260207.sql
```

---

## Post-Deployment Checklist

- [ ] All environment variables set correctly (especially `BETTER_AUTH_URL`)
- [ ] Container is running: `docker ps | grep dropboard`
- [ ] Health check passes: `/api/health` returns 200
- [ ] Login works and redirects to `/dashboard`
- [ ] All sidebar navigation items work
- [ ] Mobile navigation (bottom bar) works
- [ ] File upload works
- [ ] File download works
- [ ] Pin/unpin items works
- [ ] Search works
- [ ] Team invites work
- [ ] Logout works

---

## Support

If issues persist:

1. Check container logs: `docker logs dropboard-app -f --tail=200`
2. Check browser console (F12 → Console tab)
3. Check network requests (F12 → Network tab)
4. Verify all environment variables: `docker exec dropboard-app env`

All code fixes have been applied and tested:
- ✅ 92 tests passing
- ✅ Production build clean
- ✅ Better Auth configured for production
- ✅ All navigation paths corrected
