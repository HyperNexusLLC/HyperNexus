#!/usr/bin/env bash
# collect-watchdog-artifacts.sh — gather the watchdog implementation artifacts
# Muse (Bobbi) requires for a review. Run this ON the Hetzner server (where
# /usr/local/bin/disk-watchdog.sh lives), as a user that can read the script,
# cron, and logs. It writes an artifacts/ directory of FILES (not summaries) per
# Muse's list. It prints NO secrets and does NOT include PM2 env or credentials.
#
#   Usage: bash scripts/collect-watchdog-artifacts.sh [outdir]
#
# Output: <outdir>/ with the files named below, plus a MANIFEST.txt.

set -uo pipefail
OUT="${1:-./watchdog-artifacts-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"
exec > >(tee -a "$OUT/MANIFEST.txt") 2>&1

echo "== HyperNexus watchdog artifact collection =="
echo "date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "host: $(hostname)"
echo "outdir: $OUT"
echo

# 1. The watchdog script, in full.
echo "[1/7] disk-watchdog.sh"
if [ -f /usr/local/bin/disk-watchdog.sh ]; then
  cp /usr/local/bin/disk-watchdog.sh "$OUT/disk-watchdog.sh"
  echo "  copied /usr/local/bin/disk-watchdog.sh ($(wc -l < /usr/local/bin/disk-watchdog.sh) lines)"
else
  echo "  MISSING: /usr/local/bin/disk-watchdog.sh not found" | tee "$OUT/disk-watchdog.sh.MISSING.txt"
fi

# 2. Cron entry (user + schedule).
echo "[2/7] cron entries"
{ echo "## crontab -l"; crontab -l 2>&1; \
  echo; echo "## /etc/cron.d/"; ls -la /etc/cron.d/ 2>&1; \
  echo; echo "## grep watchdog in cron"; grep -rn "watchdog" /etc/cron* 2>/dev/null; } > "$OUT/cron.txt"
echo "  -> cron.txt"

# 3. Recent watchdog log with timestamps + prune actions.
echo "[3/7] /var/log/disk-watchdog.log"
if [ -f /var/log/disk-watchdog.log ]; then
  tail -n 300 /var/log/disk-watchdog.log > "$OUT/disk-watchdog.log.tail.txt"
  echo "  -> disk-watchdog.log.tail.txt (last 300 lines)"
else
  echo "  MISSING: /var/log/disk-watchdog.log not found" | tee "$OUT/disk-watchdog.log.MISSING.txt"
fi

# 4. Proof of where AUTO_PRUNE_RUNNER_VOLUMES=1 is set (actual env, not a commit msg).
echo "[4/7] AUTO_PRUNE_RUNNER_VOLUMES proof"
{
  echo "## grep in watchdog script"
  grep -n "AUTO_PRUNE_RUNNER_VOLUMES" /usr/local/bin/disk-watchdog.sh 2>&1
  echo; echo "## cron/env files"
  grep -rn "AUTO_PRUNE_RUNNER_VOLUMES" /etc/cron* /etc/environment /etc/profile.d/ /etc/systemd/system/ 2>/dev/null
  echo; echo "## exported in this shell?"; env | grep -i "AUTO_PRUNE" || echo "(not set in collector shell)"
} > "$OUT/AUTO_PRUNE_PROOF.txt"
echo "  -> AUTO_PRUNE_PROOF.txt"

# 5. fwber commit carrying the ratification text (if the fwber repo is present).
echo "[5/7] fwber ratification commit 117a22a20"
FWBER_DIR="${FWBER_DIR:-/opt/fwber}"
if [ -d "$FWBER_DIR/.git" ]; then
  git -C "$FWBER_DIR" show 117a22a20 > "$OUT/fwber-ratification-117a22a20.diff" 2>&1
  echo "  -> fwber-ratification-117a22a20.diff (from $FWBER_DIR)"
else
  echo "  SKIPPED: fwber repo not found at $FWBER_DIR (set FWBER_DIR=... to point at it)" \
    | tee "$OUT/fwber-ratification.SKIPPED.txt"
fi

# 6. Measured rebuild churn (job durations, cache-miss rebuilds, docker events).
echo "[6/7] measured rebuild churn (best-effort; needs your CI job history)"
{
  echo "## docker events — HyperNexus CI containers (last 7 days)"
  docker events --since 168h --until 0s --filter 'event=start' \
    --format '{{.Time}} {{.Actor.Attributes.name}} {{.Action}}' 2>&1 | grep -iE "ci|runner|build" | tail -100
  echo; echo "## docker image build/layer cache misses (approx)"
  docker system events --since 168h --filter 'type=image' --format '{{.Time}} {{.Action}} {{.Actor.ID}}' 2>&1 | tail -100
  echo; echo "## NOTE: job-duration deltas vs baseline and cache-miss rebuild counts"
  echo "## must come from the CI job history (runner logs). Attach those separately."
} > "$OUT/rebuild-churn.txt"
echo "  -> rebuild-churn.txt (partial — CI job history must be added)"

# 7. df output, and confirm no PM2 env/secrets leak.
echo "[7/7] df + secret scan"
{ echo "## df -h"; df -h; echo; echo "## df -h (target volumes)"; df -h / /var/lib/docker 2>/dev/null; } > "$OUT/df.txt"
# Redact anything that looks like a secret before this leaves the box.
if grep -rInE "PM2_|SECRET|PASSWORD|TOKEN|sk-|ghp_|whsec_" "$OUT" >/dev/null 2>&1; then
  echo "  WARNING: possible secret found in artifacts — review before sharing" | tee -a "$OUT/WARN-SECRETS.txt"
  grep -rInE "PM2_|SECRET|PASSWORD|TOKEN|sk-|ghp_|whsec_" "$OUT" >> "$OUT/WARN-SECRETS.txt"
else
  echo "  no obvious secrets/PM2 env detected in artifacts"
fi

echo
echo "== done =="
echo "Artifacts in: $OUT"
echo "Review checklist (Muse):"
echo "  [ ] disk-watchdog.sh (full)"
echo "  [ ] cron entry (user + schedule)"
echo "  [ ] disk-watchdog.log recent entries (timestamps + prune actions)"
echo "  [ ] AUTO_PRUNE_RUNNER_VOLUMES=1 set in actual env (not just a commit msg)"
echo "  [ ] fwber commit 117a22a20 ratification text (as diff)"
echo "  [ ] measured rebuild churn (job durations vs baseline, cache-miss rebuilds,"
echo "      timestamps correlated from watchdog log + docker events for HyperNexus CI)"
echo "  [ ] df before/after prunes (before/after needs historical — add if available)"
echo "  [ ] no PM2 env or secrets in any of it"
