#!/bin/bash
# Deploy HyperNexus v1.0.11 to Hetzner
set -e

echo "=== Deploying HyperNexus v1.0.11 ==="

# Backup current binary
if [ -f /opt/tormentnexus/tormentnexus ]; then
    cp /opt/tormentnexus/tormentnexus /opt/tormentnexus/tormentnexus.bak.$(date +%Y%m%d%H%M%S)
    echo "Backed up current binary"
fi

# Replace binary (rm first to avoid "Text file busy")
rm -f /opt/tormentnexus/tormentnexus
echo "Old binary removed"

echo "Ready to receive new binary at /opt/tormentnexus/tormentnexus"
echo "DEPLOY_READY"
