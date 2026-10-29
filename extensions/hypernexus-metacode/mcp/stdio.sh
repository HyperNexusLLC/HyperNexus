#!/bin/sh
# MCP stdio launcher: exec the HyperNexus kernel MCP server.
# Resolves the repo root relative to this plugin directory.
PLUGIN_DIR=$(cd "$(dirname "$0")/.." && pwd)
ROOT=$(cd "$PLUGIN_DIR/../.." && pwd)
# Env contract: HYPERNEXUS_WORKSPACE_ROOT scopes the kernel to this
# workspace; HYPERNEXUS_URL overrides the kernel base URL. Defaults keep
# the stock config working when the caller exports nothing.
: "${HYPERNEXUS_WORKSPACE_ROOT:=$ROOT}"
: "${HYPERNEXUS_URL:=http://127.0.0.1:7778}"
export HYPERNEXUS_WORKSPACE_ROOT HYPERNEXUS_URL
for BIN in "$ROOT/bin/hypernexus.exe" "$ROOT/bin/hypernexus"; do
  if [ -x "$BIN" ]; then exec "$BIN" mcp; fi
done
echo "hypernexus kernel binary not found under $ROOT/bin" >&2
exit 1
