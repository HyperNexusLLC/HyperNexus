#!/bin/bash
set -euo pipefail
chmod +x /opt/tormentnexus/scripts/backup-l2.sh

TOKEN="hn_$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
echo "$TOKEN" > /root/.hn-dashboard-token
chmod 600 /root/.hn-dashboard-token

if grep -q HYPERNEXUS_DASHBOARD_TOKEN /etc/systemd/system/hypernexus-kernel.service; then
  sed -i "s|^Environment=HYPERNEXUS_DASHBOARD_TOKEN=.*|Environment=HYPERNEXUS_DASHBOARD_TOKEN=$TOKEN|" /etc/systemd/system/hypernexus-kernel.service
else
  sed -i "/Environment=HYPERNEXUS_WORKSPACE_ROOT/a Environment=HYPERNEXUS_DASHBOARD_TOKEN=$TOKEN" /etc/systemd/system/hypernexus-kernel.service
fi

systemctl daemon-reload
systemctl stop hypernexus-kernel || true
mv /opt/tormentnexus/tormentnexus /opt/tormentnexus/tormentnexus.bak
mv /opt/tormentnexus/tormentnexus-new /opt/tormentnexus/tormentnexus
chmod +x /opt/tormentnexus/tormentnexus
systemctl start hypernexus-kernel
sleep 3

echo "health: $(curl -s http://127.0.0.1:7778/health)"
echo "no-token: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:7778/dashboard)"
echo "with-token: $(curl -s -o /dev/null -w '%{http_code}' -H "X-Dashboard-Token: $TOKEN" http://127.0.0.1:7778/dashboard)"

(crontab -l 2>/dev/null | grep -v backup-l2 || true; echo '17 3 * * * /opt/tormentnexus/scripts/backup-l2.sh >> /var/log/hypernexus-backup.log 2>&1') | crontab -
crontab -l | grep backup
/opt/tormentnexus/scripts/backup-l2.sh | tail -5
echo "TOKEN=$TOKEN"
