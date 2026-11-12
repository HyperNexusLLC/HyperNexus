#!/bin/sh
# hn-prime.sh — session-start primer for hax (session_start hook equivalent)
# --------------------------------------------------------------------------
# hax has no in-process hooks; this script is the outside-process equivalent of
# the pi extension's session_start/before_agent_start handlers: it primes the
# turn with live kernel state + fast FTS context, printed for the model to read.
# Run at the start of a hax session (or before a `hax -p` one-shot):
#   sh addons/hax/scripts/hn-prime.sh "current task sentence"
HN="${HN:-node addons/hax/hn.mjs}"
TASK="${1:-general session}"
echo "## HyperNexus session prime — ${TASK}"
$HN status 2>/dev/null | head -c 600
echo
echo "### Fast context"
$HN fts "$TASK" 5 2>/dev/null | head -c 2500
