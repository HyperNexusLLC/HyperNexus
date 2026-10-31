#!/bin/sh
# HyperNexus Muse installer (POSIX): prerequisite check only.
set -eu
command -v muse >/dev/null 2>&1 || { echo "muse CLI not found on PATH."; exit 1; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
test -x "$ROOT/bin/hypernexus" -o -x "$ROOT/bin/hypernexus.exe" || { echo "hypernexus kernel binary not found."; exit 1; }
curl -s -m 5 http://127.0.0.1:7778/health
echo ""
echo "Prerequisites OK."
