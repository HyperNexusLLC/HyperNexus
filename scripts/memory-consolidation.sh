#!/bin/bash
# Memory consolidation — run via cron every 6 hours
# Dedupes facts, applies forgetting-curve decay, consolidates short-term into long-term
# Endpoint: POST /api/memory/maintenance/local
set -euo pipefail
LOG=/var/log/hypernexus/memory-consolidation.log
mkdir -p /var/log/hypernexus
echo "=== $(date -u) ===" >> "$LOG"
curl -s -X POST http://127.0.0.1:7778/api/memory/maintenance >> "$LOG" 2>&1
echo "" >> "$LOG"
# Prune log to last 500 lines
tail -500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
