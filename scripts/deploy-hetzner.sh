#!/usr/bin/env bash
# HyperNexus Hetzner Deployment Script
# Usage: ./scripts/deploy-hetzner.sh [user@host]
# Requires: SSH access to the Hetzner server
set -euo pipefail

REMOTE="${1:-root@hypernexus.site}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REMOTE_DIR="/opt/hypernexus"

echo "=== HyperNexus Hetzner Deployment ==="
echo "Remote: $REMOTE"
echo "Remote dir: $REMOTE_DIR"
echo ""

# 1. Build artifacts
echo "[1/5] Verifying build artifacts..."
if [ ! -f "$PROJECT_DIR/bin/hypernexus.exe" ]; then
    echo "ERROR: bin/hypernexus.exe not found. Run 'cd go && go build -o ../bin/hypernexus.exe ./cmd/tormentnexus'"
    exit 1
fi
if [ ! -d "$PROJECT_DIR/apps/web/.next-build/standalone" ]; then
    echo "ERROR: apps/web/.next-build/standalone not found. Run 'cd apps/web && pnpm run build'"
    exit 1
fi
echo "  ✓ Kernel binary: $(du -h "$PROJECT_DIR/bin/hypernexus.exe" | cut -f1)"
echo "  ✓ Dashboard standalone: $(du -sh "$PROJECT_DIR/apps/web/.next-build/standalone" | cut -f1)"

# 2. Upload kernel
echo "[2/5] Uploading Go kernel..."
scp "$PROJECT_DIR/bin/hypernexus.exe" "$REMOTE:$REMOTE_DIR/hypernexus.exe"

# 3. Upload dashboard
echo "[3/5] Uploading dashboard..."
ssh "$REMOTE" "rm -rf $REMOTE_DIR/web-standalone"
scp -r "$PROJECT_DIR/apps/web/.next-build/standalone" "$REMOTE:$REMOTE_DIR/web-standalone"

# 4. Upload config
echo "[4/5] Uploading config..."
if [ -f "$PROJECT_DIR/mcp.jsonc" ]; then
    scp "$PROJECT_DIR/mcp.jsonc" "$REMOTE:$REMOTE_DIR/mcp.jsonc"
fi

# 5. Restart services
echo "[5/5] Restarting services..."
ssh "$REMOTE" "systemctl restart hypernexus-kernel && systemctl restart hypernexus-dashboard && systemctl reload nginx"

# Verify
echo ""
echo "=== Verifying deployment ==="
sleep 3
HEALTH=$(ssh "$REMOTE" "curl -s http://127.0.0.1:7778/health" 2>/dev/null || echo "unreachable")
echo "Kernel health: $HEALTH"
DASH=$(ssh "$REMOTE" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:7779/dashboard" 2>/dev/null || echo "unreachable")
echo "Dashboard status: $DASH"

echo ""
echo "=== Deployment complete ==="
echo "Verify: curl -sk https://hypernexus.site/api/go/health"
echo "Verify: curl -sk https://hypernexus.site/dashboard"
