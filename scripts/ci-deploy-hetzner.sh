#!/usr/bin/env bash
# CI helper: upload Linux kernel binary to Hetzner, swap, restart, smoke-test.
set -euo pipefail

BIN="${1:?usage: ci-deploy-hetzner.sh <linux-binary>}"
HOST="${HETZNER_HOST:-5.161.250.43}"
REMOTE_DIR="/opt/tormentnexus"
LOCAL_SIZE=$(wc -c < "$BIN")
echo "local binary size: $LOCAL_SIZE"

gzip -c "$BIN" > "${BIN}.gz"
scp -o StrictHostKeyChecking=accept-new "${BIN}.gz" "root@${HOST}:${REMOTE_DIR}/tormentnexus-new.gz"
ssh "root@${HOST}" bash -s <<EOF
set -euo pipefail
cd ${REMOTE_DIR}
gunzip -c tormentnexus-new.gz > tormentnexus-new
rm -f tormentnexus-new.gz
REMOTE_SIZE=\$(wc -c < tormentnexus-new)
echo "remote binary size: \$REMOTE_SIZE"
test "\$REMOTE_SIZE" = "${LOCAL_SIZE}"
chmod +x tormentnexus-new
systemctl stop hypernexus-kernel
mv tormentnexus tormentnexus.bak || true
mv tormentnexus-new tormentnexus
systemctl start hypernexus-kernel
sleep 3
curl -sf http://127.0.0.1:7778/health
echo
EOF

echo "=== smoke tests ==="
curl -sf "https://hypernexus.site/api/go/health" | grep -q '"ok":true'
code=$(curl -sk -o /dev/null -w '%{http_code}' "https://hypernexus.site/kernel-dashboard")
test "$code" = "401"
code=$(curl -sk -o /dev/null -w '%{http_code}' -X POST \
  -H 'Content-Type: application/json' \
  -d '{"memories":[]}' \
  "https://hypernexus.site/api/memory/l2/import")
test "$code" = "401"
echo "smoke tests passed"
