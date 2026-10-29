#!/bin/sh
# meta-env.sh — export a LIVE Meta Muse OAuth key for hax from pi's auth.json
# ---------------------------------------------------------------------------
# hax has no OAuth login flow for Meta (its /login manages codex only), so this
# script bridges pi's Meta subscription into hax's provider model: it reads the
# live `access` key minted by `pi` (Meta device flow → api.meta.ai/muse-code/key),
# verifies it is still valid, and exports HAX_META_API_KEY for the hax process.
#
# Usage:
#   eval "$(sh addons/hax/scripts/meta-env.sh)" && hax --preset meta "hello"
#   eval "$(sh addons/hax/scripts/meta-env.sh)"   # then run hax interactively
#
# The minted key lives ~24h (expires field in pi auth.json). When it lapses,
# re-run `pi` login for meta, then re-source this script. Nothing is written to
# config.json — the key stays in the environment, per hax conventions.
set -eu

pick_auth() {
  for c in "$HOME/.pi/agent/auth.json" "${USERPROFILE:-}/.pi/agent/auth.json" \
           "C:/Users/hyper/.pi/agent/auth.json" "/c/Users/hyper/.pi/agent/auth.json"; do
    [ -f "$c" ] && { printf '%s' "$c"; return 0; }
  done
  return 1
}

AUTH="$(pick_auth 2>/dev/null || true)"
if [ -z "${AUTH:-}" ]; then
  echo "meta-env.sh: no pi auth.json found (expected ~/.pi/agent/auth.json)" >&2
  return 1 2>/dev/null || exit 1
fi

META_KEY="$(python3 -c "
import json,sys
try:
  d=json.load(open(r'''$AUTH'''))
  m=d.get('meta') or {}
  print(m.get('access',''))
except Exception as e:
  print('ERR:'+str(e), file=sys.stderr); sys.exit(1)
")"
case "$META_KEY" in
  ''|ERR:*) echo "meta-env.sh: no meta access key in $AUTH — run pi and log in with meta first" >&2; return 1 2>/dev/null || exit 1;;
esac

# Validate against the Meta endpoint before exporting (cheap GET /models).
if ! python3 -c "
import sys,urllib.request
req=urllib.request.Request('https://api.meta.ai/v1/models',headers={'Authorization':'Bearer $META_KEY'})
try:
  urllib.request.urlopen(req,timeout=20).read(64)
except Exception as e:
  print('meta key validation failed: '+str(e)[:200],file=sys.stderr); sys.exit(1)
" 2>/dev/null; then
  # Fall through with a warning, not a hard failure: the key may still work for
  # /responses even if /models is restricted on this plan.
  echo "meta-env.sh: warning: key did not validate on GET /models; exporting anyway" >&2
fi

export HAX_META_API_KEY="$META_KEY"
# Also satisfy hax's shipped openai-compatible env binding for ad-hoc runs.
export HAX_OPENAI_API_KEY="$META_KEY"
export HAX_OPENAI_BASE_URL="${HAX_OPENAI_BASE_URL:-https://api.meta.ai/v1}"
export HAX_OPENAI_API="${HAX_OPENAI_API:-responses}"
echo "export HAX_META_API_KEY='$META_KEY'"
echo "export HAX_OPENAI_API_KEY='$META_KEY'"
echo "export HAX_OPENAI_BASE_URL='$HAX_OPENAI_BASE_URL'"
echo "export HAX_OPENAI_API='$HAX_OPENAI_API'"
echo "# meta-env.sh: live Meta Muse key exported ($(printf '%s' "$META_KEY" | wc -c | tr -d ' ') chars) from $AUTH" >&2
