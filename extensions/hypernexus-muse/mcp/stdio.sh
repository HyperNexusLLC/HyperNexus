#!/bin/sh
# MCP stdio launcher: exec the HyperNexus kernel MCP server.
# Resolves the repo root relative to this plugin directory.
PLUGIN_DIR=$(cd "$(dirname "$0")/.." && pwd)
ROOT=$(cd "$PLUGIN_DIR/../.." && pwd)
for BIN in "$ROOT/bin/hypernexus.exe" "$ROOT/bin/hypernexus"; do
  if [ -x "$BIN" ]; then exec "$BIN" mcp; fi
done
echo "hypernexus kernel binary not found under $ROOT/bin" >&2
exit 1
