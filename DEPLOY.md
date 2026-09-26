# DEPLOY.md — HyperNexus Deployment Guide

## Quick Start (Local Development)

### Prerequisites

- Go 1.25+
- Node.js 20+
- pnpm 10+
- Edge browser (for CDP automation)

### 1. Clone Repository

```bash
git clone https://gitlab.com/HyperNexusLLC/HyperNexus.git
cd HyperNexus
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build Go Backend

```bash
cd go
go build -o ../bin/hypernexus ./cmd/tormentnexus
go build -o ../bin/hypernexus-cloud ./cmd/cloud
```

### 4. Start Services

```bash
# Terminal 1: Go kernel
./bin/hypernexus -port 7778

# Terminal 2: Cloud server
./bin/hypernexus-cloud -port 7780

# Terminal 3: Dashboard
cd apps/web
pnpm dev
```

### 5. Access Dashboard

Open <http://localhost:7779> in your browser.

---

## Production Deployment (Hetzner)

### Server Requirements

- Ubuntu 22.04 LTS
- 2 vCPUs, 4GB RAM minimum
- 50GB SSD storage
- Domain: hypernexus.site

### 1. SSH into Server

```bash
ssh root@hypernexus.site
```

### 2. Create Service User

```bash
useradd -m -s /bin/bash hypernexus
mkdir -p /opt/hypernexus
chown hypernexus:hypernexus /opt/hypernexus
```

### 3. Upload Binaries

```bash
# From local machine
scp bin/hypernexus-linux-amd64 root@hypernexus.site:/opt/hypernexus/bin/hypernexus
scp bin/hypernexus-cloud-linux-amd64 root@hypernexus.site:/opt/hypernexus/bin/hypernexus-cloud
```

### 4. Create systemd Services

```bash
# /etc/systemd/system/hypernexus.service
[Unit]
Description=HyperNexus AI Agent
After=network.target

[Service]
Type=simple
User=hypernexus
WorkingDirectory=/opt/hypernexus
ExecStart=/opt/hypernexus/bin/hypernexus -port 7778
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# /etc/systemd/system/hypernexus-cloud.service
[Unit]
Description=HyperNexus Cloud Server
After=network.target

[Service]
Type=simple
User=hypernexus
WorkingDirectory=/opt/hypernexus
ExecStart=/opt/hypernexus/bin/hypernexus-cloud -port 7780 -db /opt/hypernexus/data/cloud.db
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 5. Start Services

```bash
systemctl daemon-reload
systemctl enable hypernexus hypernexus-cloud
systemctl start hypernexus hypernexus-cloud
```

### 6. Configure nginx

```nginx
# /etc/nginx/sites-available/hypernexus.site
server {
    listen 443 ssl http2;
    server_name hypernexus.site;

    ssl_certificate /etc/letsencrypt/live/hypernexus.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hypernexus.site/privkey.pem;

    location / {
        proxy_pass http://localhost:7779;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:7778;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /cloud/ {
        proxy_pass http://localhost:7780;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 7. Enable Site

```bash
ln -s /etc/nginx/sites-available/hypernexus.site /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## Environment Variables

### Required

```bash
# .env
PORT=7778
ENVIRONMENT=production

# Stripe
STRIPE_API_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

### Optional

```bash
# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_URL=http://localhost:11434

# Memory
MEMORY_DB_PATH=/opt/hypernexus/data/memory.db

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/hypernexus.log
```

---

## Monitoring

### Health Checks

```bash
# Check Go kernel
curl http://localhost:7778/health

# Check Cloud server
curl http://localhost:7780/api/cloud/health

# Check Dashboard
curl -s -o /dev/null -w "%{http_code}" http://localhost:7779
```

### Logs

```bash
# View Go kernel logs
journalctl -u hypernexus -f

# View Cloud server logs
journalctl -u hypernexus-cloud -f

# View nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Metrics

- Request rate: `/api/metrics/requests`
- Error rate: `/api/metrics/errors`
- Latency: `/api/metrics/latency`
- Memory usage: `/api/metrics/memory`

---

## Backup & Recovery

### Database Backup

```bash
# Backup SQLite databases
cp /opt/hypernexus/data/memory.db /opt/hypernexus/backups/memory-$(date +%Y%m%d).db
cp /opt/hypernexus/data/cloud.db /opt/hypernexus/backups/cloud-$(date +%Y%m%d).db
```

### Automated Backups

```bash
# Add to crontab
0 3 * * * /opt/hypernexus/scripts/backup.sh
```

### Recovery

```bash
# Restore from backup
cp /opt/hypernexus/backups/memory-20260727.db /opt/hypernexus/data/memory.db
systemctl restart hypernexus
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
journalctl -u hypernexus -n 100

# Check port availability
netstat -tlnp | grep 7778

# Check permissions
ls -la /opt/hypernexus/bin/
```

### High Memory Usage

```bash
# Check Go memory
curl http://localhost:7778/debug/pprof/heap > heap.prof
go tool pprof heap.prof
```

### SSL Certificate Issues

```bash
# Renew certificate
certbot renew --dry-run
systemctl reload nginx
```

---

## Security

### Firewall

```bash
# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### SSH Hardening

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
MaxAuthTries 3
```

### Application Security

- All API endpoints require authentication
- RBAC for memory access
- Audit logging for all operations
- Encrypted storage for sensitive data

---

## Performance Tuning

### Go Kernel

```bash
# Increase file descriptor limit
ulimit -n 65536

# Set GOMAXPROCS
export GOMAXPROCS=4
```

### nginx

```nginx
# Enable gzip compression
gzip on;
gzip_types text/plain application/json application/javascript;

# Enable caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g;
```

### SQLite

```sql
-- Enable WAL mode for better concurrency
PRAGMA journal_mode=WAL;

-- Increase cache size
PRAGMA cache_size=-64000;  -- 64MB
```

---

## Scaling

### Horizontal Scaling

- Deploy multiple Go kernel instances behind nginx load balancer
- Use shared SQLite database (NFS or distributed filesystem)
- Session affinity for WebSocket connections

### Vertical Scaling

- Increase server RAM for larger memory stores
- Add SSD storage for faster database operations
- Use dedicated server for Cloud operations

---

## Support

- **Documentation:** <https://hypernexus.site/docs>
- **Issues:** <https://gitlab.com/HyperNexusLLC/HyperNexus/issues>
- **Email:** <support@hypernexus.site>
- **Discord:** <https://discord.gg/hypernexus>
