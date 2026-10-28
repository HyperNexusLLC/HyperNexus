#!/usr/bin/env bash
# oi-meta.sh — Open Interpreter with Meta Muse Spark via pi OAuth (no snapshots).
# Mints a fresh Meta key at every invocation using pi's identity token
# (pi owns refresh), wires it into OI's native stores, then execs.
# Usage: bin/oi-meta.sh exec "prompt..."   (any interpreter args passthrough)
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRESH_KEY="$("$ROOT/addons/droid/bin/meta-muse-key.mjs")" || { echo "oi-meta: key mint failed" >&2; exit 1; }
export MODEL_API_KEY="$FRESH_KEY"
python - "$FRESH_KEY" <<'EOF'
import json, sys
p = 'C:/Users/hyper/.openinterpreter/auth.json'
a = json.load(open(p))
a['OPENAI_API_KEY'] = sys.argv[1]
json.dump(a, open(p, 'w'), indent=2)
EOF
export OPENAI_API_KEY="$FRESH_KEY"
exec interpreter "$@"
