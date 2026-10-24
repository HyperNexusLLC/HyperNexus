#!/bin/bash
# =============================================================================
# HyperNexus Multi-Tenant Provisioning Script
# Usage: ./tenant-provision.sh <tenant-id> <tenant-port>
#   tenant-id:   unique org identifier (e.g., "acme-corp")
#   tenant-port: unique web dashboard port (e.g., 3001, 3002...)
#   The sidecar (kernel) gets tenant-port + 1.
# =============================================================================
set -euo pipefail

TENANT_ID="${1:?Usage: $0 <tenant-id> <tenant-port>}"
TENANT_PORT="${2:?Usage: $0 <tenant-id> <tenant-port>}"
SIDECAR_PORT=$((TENANT_PORT + 1))
DATA_ROOT="/var/lib/hypernexus/tenants"

echo "=== Provisioning tenant: $TENANT_ID (web:$TENANT_PORT sidecar:$SIDECAR_PORT) ==="

# 1. Create isolated data directories
mkdir -p "$DATA_ROOT/$TENANT_ID"/{data,sessions,profiles,logs}

# 2. Generate random auth token
AUTH_TOKEN=$(openssl rand -hex 32)
echo "$AUTH_TOKEN" >"$DATA_ROOT/$TENANT_ID/auth_token.txt"

# 3. Generate docker-compose override for this tenant
cat >"/tmp/docker-compose.$TENANT_ID.yml" <<COMPOSE_EOF
services:
  web-${TENANT_ID}:
    image: hypernexus-web:latest
    container_name: tn-web-${TENANT_ID}
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://sidecar-${TENANT_ID}:7778
      - TORMENTNEXUS_TN_KERNEL_URL=http://sidecar-${TENANT_ID}:7778
      - TORMENTNEXUS_TRPC_UPSTREAM=http://sidecar-${TENANT_ID}:7778/trpc
      - TORMENTNEXUS_GO_API_BASE=http://sidecar-${TENANT_ID}:7778
      - PORT=7779
    ports:
      - "127.0.0.1:${TENANT_PORT}:7779"
    depends_on:
      - sidecar-${TENANT_ID}
    networks:
      - tenant-network
    restart: on-failure:5

  sidecar-${TENANT_ID}:
    image: hypernexus-sidecar:latest
    container_name: tn-sidecar-${TENANT_ID}
    command: ["serve", "-host", "0.0.0.0", "-port", "7778", "-config-dir", "/root/.hypernexus"]
    ports:
      - "127.0.0.1:${SIDECAR_PORT}:7778"
    environment:
      - HYPERNEXUS_GOSSIP_SHARED_KEY=${AUTH_TOKEN}
    volumes:
      - ${DATA_ROOT}/${TENANT_ID}/data:/root/.hypernexus
    networks:
      - tenant-network
    restart: on-failure:5

networks:
  tenant-network:
    external: true
COMPOSE_EOF

# 4. Start the tenant containers
echo "Starting containers for $TENANT_ID..."
docker compose -f "/tmp/docker-compose.$TENANT_ID.yml" up -d

# 5. Create Nginx config for tenant subdomain
cat >"/etc/nginx/sites-enabled/hypernexus.${TENANT_ID}.conf" <<NGINX_EOF
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/hypernexus.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hypernexus.site/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    server_name ${TENANT_ID}.hypernexus.site;

    # tRPC -> tenant sidecar (kernel)
    location /trpc {
        proxy_pass http://127.0.0.1:${SIDECAR_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Next.js proxy routes -> tenant dashboard (proxies to sidecar internally)
    location /api/go/ {
        proxy_pass http://127.0.0.1:${TENANT_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Kernel HTTP API -> tenant sidecar
    location /api/ {
        proxy_pass http://127.0.0.1:${SIDECAR_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Dashboard
    location / {
        proxy_pass http://127.0.0.1:${TENANT_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health
    location /health {
        proxy_pass http://127.0.0.1:${TENANT_PORT}/dashboard;
        access_log off;
    }
}
NGINX_EOF

# 6. Reload Nginx
nginx -t && systemctl reload nginx

# 7. Wait for containers to be healthy
echo "Waiting for $TENANT_ID to be healthy..."
sleep 5
if curl -sf "http://127.0.0.1:${TENANT_PORT}/dashboard" >/dev/null 2>&1; then
	echo "✅ Tenant $TENANT_ID is healthy!"
	echo "   URL: https://${TENANT_ID}.hypernexus.site"
else
	echo "⚠️  Tenant $TENANT_ID may still be starting. Check: docker logs tn-web-${TENANT_ID}"
fi

echo "=== Provisioning complete for $TENANT_ID ==="
