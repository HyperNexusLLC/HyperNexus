#!/bin/bash
# HyperNexus Production Monitor
# Runs every 5 minutes via cron. Logs to /var/log/hypernexus-monitor.log
LOG=/var/log/hypernexus-monitor.log

check() {
  name=$1
  url=$2
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null)
  if [ "$status" != "200" ]; then
    echo "[$(date)] ALERT: $name returned $status" >> "$LOG"
  fi
}

check kernel http://127.0.0.1:7778/health
check dashboard http://127.0.0.1:7779/dashboard

DISK=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK" -gt 85 ]; then
  echo "[$(date)] ALERT: Disk at ${DISK}%" >> "$LOG"
fi

MEM=$(free | awk '/Mem:/{printf "%.0f", $3/$2*100}')
if [ "$MEM" -gt 90 ]; then
  echo "[$(date)] ALERT: Memory at ${MEM}%" >> "$LOG"
fi
