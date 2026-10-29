#!/bin/sh
# HyperNexus Codex installer (POSIX) — registers MCP stdio server,
# installs the plugin hooks/skill, and verifies with
# `codex mcp list` / `codex mcp get`. Port 7778 is authoritative.
set -u
PLUGIN_DIR=$(cd "$(dirname "$0")/.." && pwd)
ROOT=$(cd "$PLUGIN_DIR/../.." && pwd)
EXE="$ROOT/bin/hypernexus.exe"

if [ ! -f "$EXE" ]; then
  # POSIX binary has no .exe suffix; fall back to extensionless build.
  if [ -f "$ROOT/bin/hypernexus" ]; then
    EXE="$ROOT/bin/hypernexus"
  else
    echo "ERROR: hypernexus binary not found under $ROOT/bin/"
    echo "Build the Go kernel first, then re-run this installer."
    exit 1
  fi
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: \`codex\` CLI not found on PATH. Install Codex CLI first."
  exit 1
fi

echo "=== 1/4: Register HyperNexus MCP server (stdio) ==="
codex mcp add hypernexus \
  --env HYPERNEXUS_WORKSPACE_ROOT="$ROOT" \
  --env HYPERNEXUS_URL="http://127.0.0.1:7778" \
  -- "$EXE" mcp || echo "(MCP entry may already exist — continuing)"

echo ""
echo "=== 2/4: Install skills (hypernexus, hypernexus-ops, hypernexus-workflows) ==="
for SKILL in hypernexus hypernexus-ops hypernexus-workflows; do
  mkdir -p "$HOME/.codex/skills/$SKILL"
  cp -r "$PLUGIN_DIR/skills/$SKILL/." "$HOME/.codex/skills/$SKILL/"
done
echo "Skills installed to \$HOME/.codex/skills/hypernexus*/"

echo ""
echo "=== 3/4: Install plugin (hooks) ==="
MKT="$ROOT/.codex/marketplace/plugins"
mkdir -p "$MKT/codex-hypernexus"
cp -r "$PLUGIN_DIR/." "$MKT/codex-hypernexus/"
codex plugin marketplace add "$MKT/.." >/dev/null 2>&1 || true
codex plugin add codex-hypernexus@hypernexus-marketplace >/dev/null 2>&1 || true
echo "Plugin staged at $MKT/codex-hypernexus"

echo ""
echo "=== 4/4: Verify ==="
codex mcp list
codex mcp get hypernexus
echo ""
echo "Done. In Codex, run /mcp — hypernexus tools should be listed."
