#!/bin/sh
# HyperNexus maki installer (POSIX): prerequisite check only.
# Installs nothing by itself; copy the extension trees per README.md,
# then /trust the project and /reload in maki.
command -v maki >/dev/null 2>&1 || { echo "maki CLI not found on PATH."; exit 1; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
[ -x "$ROOT/bin/hypernexus" ] || [ -x "$ROOT/bin/hypernexus.exe" ] \
  || { echo "hypernexus kernel binary not found under bin/."; exit 1; }
curl -s -m 5 http://127.0.0.1:7778/health
echo ""
echo "Prerequisites OK. Copy per README.md, then /trust and /reload in maki."
