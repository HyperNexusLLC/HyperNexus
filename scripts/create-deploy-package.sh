#!/usr/bin/env bash
# HyperNexus Deployment Package Creator
# Creates a self-contained deployment package for manual Hetzner deployment.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_DIR/deploy-artifacts"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="hypernexus-deploy-${TIMESTAMP}"

echo "=== HyperNexus Deployment Package Creator ==="
echo ""

# 1. Verify build artifacts
echo "[1/4] Verifying build artifacts..."
if [ ! -f "$PROJECT_DIR/bin/hypernexus.exe" ] && [ ! -f "$PROJECT_DIR/bin/hypernexus" ]; then
    echo "Building Go kernel..."
    (cd "$PROJECT_DIR/go" && go build -ldflags "-s -w" -buildvcs=false -o ../bin/hypernexus ./cmd/tormentnexus)
fi
if [ ! -d "$PROJECT_DIR/apps/web/.next-build/standalone" ]; then
    echo "ERROR: Dashboard standalone build not found. Run 'cd apps/web && pnpm run build'"
    exit 1
fi
echo "  ✓ Artifacts verified"

# 2. Create package directory
echo "[2/4] Creating package..."
mkdir -p "$OUTPUT_DIR/$PACKAGE_NAME"
cp "$PROJECT_DIR/bin/hypernexus.exe" "$OUTPUT_DIR/$PACKAGE_NAME/hypernexus" 2>/dev/null || \
    cp "$PROJECT_DIR/bin/hypernexus" "$OUTPUT_DIR/$PACKAGE_NAME/hypernexus"
cp -r "$PROJECT_DIR/apps/web/.next-build/standalone" "$OUTPUT_DIR/$PACKAGE_NAME/web-standalone"
cp "$PROJECT_DIR/mcp.jsonc" "$OUTPUT_DIR/$PACKAGE_NAME/mcp.jsonc" 2>/dev/null || true
cp "$PROJECT_DIR/scripts/deploy-hetzner.sh" "$OUTPUT_DIR/$PACKAGE_NAME/deploy.sh"

# 3. Create deployment instructions
cat > "$OUTPUT_DIR/$PACKAGE_NAME/README-DEPLOY.md" << 'EOF'
# HyperNexus Deployment Package

## Contents
- `hypernexus` — Go kernel binary
- `web-standalone/` — Next.js dashboard (standalone build)
- `mcp.jsonc` — MCP server configuration
- `deploy.sh` — Deployment script

## Deployment Steps

1. Copy this package to the server:
   ```bash
   scp -r hypernexus-deploy-* root@hypernexus.site:/opt/hypernexus/
   ```

2. SSH into the server:
   ```bash
   ssh root@hypernexus.site
   ```

3. Run the deployment:
   ```bash
   cd /opt/hypernexus/hypernexus-deploy-*
   chmod +x deploy.sh
   ./deploy.sh
   ```

4. Verify:
   ```bash
   curl -s http://127.0.0.1:7778/health
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:7779/dashboard
   ```

## Service Management
```bash
systemctl restart hypernexus-kernel
systemctl restart hypernexus-dashboard
systemctl reload nginx
```
EOF

# 4. Create tarball
echo "[3/4] Creating tarball..."
tar -czf "$OUTPUT_DIR/$PACKAGE_NAME.tar.gz" -C "$OUTPUT_DIR" "$PACKAGE_NAME"
echo "  ✓ $OUTPUT_DIR/$PACKAGE_NAME.tar.gz"

# 5. Summary
echo "[4/4] Summary..."
echo ""
echo "  Package: $OUTPUT_DIR/$PACKAGE_NAME.tar.gz"
echo "  Size: $(du -h "$OUTPUT_DIR/$PACKAGE_NAME.tar.gz" | cut -f1)"
echo ""
echo "  To deploy:"
echo "    scp $OUTPUT_DIR/$PACKAGE_NAME.tar.gz root@hypernexus.site:/tmp/"
echo "    ssh root@hypernexus.site 'cd /tmp && tar xzf $PACKAGE_NAME.tar.gz && cd $PACKAGE_NAME && ./deploy.sh'"
echo ""
echo "=== Done ==="
