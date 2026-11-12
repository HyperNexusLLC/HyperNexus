#!/bin/sh
# hn-turn.sh — per-turn maintenance for hax (context/turn_end/compact equivalents)
# -------------------------------------------------------------------------------
# hax has no in-turn interception; orchestrate around the turn instead:
#   sh addons/hax/scripts/hn-turn.sh pre "task"     # inject fast context (context hook)
#   hax -p "..."                                     # the turn itself
#   sh addons/hax/scripts/hn-turn.sh post "summary" # persist turn note (turn_end hook)
HN="${HN:-node addons/hax/hn.mjs}"
MODE="${1:-pre}"
TEXT="${2:-session work}"
case "$MODE" in
  pre) $HN fts "$TEXT" 3 2>/dev/null | head -c 1500 ;;
  post)
    # turn_end equivalent: persist a short turn note, fire-and-forget.
    $HN observe "turn note: $TEXT" "system:turn" >/dev/null 2>&1
    echo "turn note persisted"
    ;;
  compact)
    # session_before_compact/session_compact equivalent: enrich + persist.
    $HN fts "$TEXT" 3 2>/dev/null | head -c 1500
    echo
    $HN handoff "$TEXT" 2>/dev/null | head -c 300
    ;;
  *) echo "usage: hn-turn.sh pre|post|compact \"text\"" >&2; exit 1 ;;
esac
