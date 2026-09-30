#!/bin/bash
# Scheduled L2 vault + agent memory backup for HyperNexus on Hetzner.
# Cron: 17 3 * * * /opt/tormentnexus/scripts/backup-l2.sh >> /var/log/hypernexus-backup.log 2>&1
set -euo pipefail

STAMP=$(date +%Y%m%d-%H%M%S)
SRC=/opt/tormentnexus/.hypernexus
DEST=/opt/tormentnexus/backups/l2
KEEP=${BACKUP_KEEP:-14}

mkdir -p "$DEST"

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$SRC/memory.db" ".backup '$DEST/memory-$STAMP.db'"
  sqlite3 "$SRC/l3_cold_archive.db" ".backup '$DEST/l3_cold_archive-$STAMP.db'" 2>/dev/null || true
else
  cp -a "$SRC/memory.db" "$DEST/memory-$STAMP.db"
  cp -a "$SRC/l3_cold_archive.db" "$DEST/l3_cold_archive-$STAMP.db" 2>/dev/null || true
fi

cp -a "$SRC/agent_memory/memories.json" "$DEST/memories-$STAMP.json" 2>/dev/null || true

if curl -sf http://127.0.0.1:7778/health >/dev/null 2>&1; then
  curl -sf http://127.0.0.1:7778/api/memory/l2/export -o "$DEST/l2-export-$STAMP.json" || true
fi

ls -1t "$DEST"/memory-*.db 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f
ls -1t "$DEST"/l3_cold_archive-*.db 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f
ls -1t "$DEST"/memories-*.json 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f
ls -1t "$DEST"/l2-export-*.json 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f

echo "[$(date -Is)] backup complete: $DEST (keep=$KEEP)"
