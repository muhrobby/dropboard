# Docker Deployment Guide

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher
- External PostgreSQL database (already configured)

## Quick Start

### 1. Setup Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and update the values
# IMPORTANT: Generate a secure BETTER_AUTH_SECRET
openssl rand -base64 32

# DATABASE_URL is already configured with your external PostgreSQL
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

- Application: http://localhost:3004
- API Health Check: http://localhost:3004/api/health

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
```

### Rebuild Container

```bash
docker-compose up -d --build app
```

### Execute Commands in Container

```bash
# Access app container
docker-compose exec app sh
```

## Resource Limits

The application has pre-configured resource limits:

### Application Container
- **CPU Limit**: 2 cores
- **Memory Limit**: 1GB
- **CPU Reservation**: 0.5 cores
- **Memory Reservation**: 256MB

To adjust these limits, edit the `deploy.resources` section in `docker-compose.yml`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | **Required** |
| `APP_PORT` | Application port | `3004` |
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3004` |
| `BETTER_AUTH_SECRET` | Auth secret key | **Required** |
| `BETTER_AUTH_URL` | Auth URL | `http://localhost:3004` |
| `NEXT_PUBLIC_ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3004` |
| `NODE_ENV` | Node environment | `production` |

## Production Deployment

### 1. Create Network

```bash
docker network create prod_net
```

### 2. Update Environment Variables

```bash
# .env
DATABASE_URL=postgresql://user:password@host:port/database
BETTER_AUTH_SECRET=your_generated_secret_here
NEXT_PUBLIC_APP_URL=https://yourdomain.com
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_ALLOWED_ORIGINS=https://yourdomain.com
```

### 3. Use Reverse Proxy (Recommended)

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
        proxy_pass http://localhost:3004;
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

## Troubleshooting

### Network Error

If you get an error about `prod_net` network not found:

```bash
# Create the external network
docker network create prod_net

# Then start the services again
docker-compose up -d
```

### Database Connection Issues

If the application cannot connect to the external database:

```bash
# Check if container can reach the database host
docker-compose exec app ping -c 3 43.133.147.104

# Check database logs in the container
docker-compose logs app | grep -i database
```

Make sure:
- The database host (`43.133.147.104`) is accessible from the Docker container
- The database port (`5433`) is open and not blocked by firewall
- The database credentials are correct

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Check if port is in use
netstat -tlnp | grep 3004
```

### Rebuild From Scratch

```bash
# Stop and remove containers
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

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

## External Database

This application uses an external PostgreSQL database. Make sure:

1. The database is accessible from your Docker host
2. The database exists and is properly configured
3. The connection string format is correct:
   ```
   postgresql://username:password@host:port/database
   ```

Current configuration:
- **Host**: 43.133.147.104
- **Port**: 5433
- **User**: postgress
- **Database**: Postgress
