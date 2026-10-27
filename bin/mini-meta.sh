#!/usr/bin/env bash
# mini-swe-agent with muse-spark-1.3-contributor via Meta OAuth subscriber login.
# Reads the OAuth access token from pi auth.json at RUNTIME — no secrets stored here.
# Pi owns refresh; if the token expires, re-run any pi session (it refreshes on use).
#
# Usage (from cmd.exe / PowerShell — git bash lacks the Windows console that
# prompt_toolkit needs, so run the CLI from a real console):
#   mini-meta "Fix the failing test in <repo path>"
#   mini-meta --help
set -uo pipefail
META_TOKEN="$(node -e "console.log(require(process.env.HOME+'/.pi/agent/auth.json').meta.access)")"
export OPENAI_API_BASE="https://api.meta.ai/v1"
export OPENAI_API_KEY="$META_TOKEN"
export MSWEA_MODEL_NAME="openai/muse-spark-1.3-contributor"
unset META_TOKEN
exec mini-swe-agent "$@"
