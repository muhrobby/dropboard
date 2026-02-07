# Docker Deployment Guide

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher

## Quick Start

### 1. Setup Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and update the values
# IMPORTANT: Generate a secure BETTER_AUTH_SECRET
openssl rand -base64 32
```

### 2. Build and Start Containers

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Check service status
docker-compose ps
```

### 3. Access the Application

- Application: http://localhost:3000
- API Health Check: http://localhost:3000/api/health

## Docker Commands

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Volumes

```bash
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### Rebuild Container

```bash
docker-compose up -d --build app
```

### Execute Commands in Container

```bash
# Access app container
docker-compose exec app sh

# Access database
docker-compose exec postgres psql -U dropboard -d dropboard
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `dropboard` |
| `POSTGRES_PASSWORD` | Database password | `dropboard` |
| `POSTGRES_DB` | Database name | `dropboard` |
| `POSTGRES_PORT` | Database port | `5432` |
| `APP_PORT` | Application port | `3000` |
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |
| `BETTER_AUTH_SECRET` | Auth secret key | **Required** |
| `BETTER_AUTH_URL` | Auth URL | `http://localhost:3000` |
| `NEXT_PUBLIC_ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

## Production Deployment

### 1. Update Environment Variables

```bash
# .env
POSTGRES_PASSWORD=your_secure_password_here
BETTER_AUTH_SECRET=your_generated_secret_here
NEXT_PUBLIC_APP_URL=https://yourdomain.com
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_ALLOWED_ORIGINS=https://yourdomain.com
```

### 2. Use Reverse Proxy (Recommended)

Use Nginx or Caddy as a reverse proxy for SSL/TLS termination.

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
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
```

### 3. Database Backups

```bash
# Backup database
docker-compose exec postgres pg_dump -U dropboard dropboard > backup.sql

# Restore database
docker-compose exec -T postgres psql -U dropboard dropboard < backup.sql
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Check if port is in use
netstat -tlnp | grep 3000
```

### Database Connection Issues

```bash
# Check if database is ready
docker-compose exec postgres pg_isready -U dropboard

# Check database logs
docker-compose logs postgres
```

### Rebuild From Scratch

```bash
# Stop and remove everything
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

## Health Check

The application includes a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```
