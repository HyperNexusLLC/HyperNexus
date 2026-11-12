#!/usr/bin/env bash
# meta-env.sh — source this to wire Meta OAuth (subscriber login, bob@bobsgame.com)
# into every harness that takes an OpenAI-compatible endpoint. Reads the live
# OAuth access token from pi auth.json at RUNTIME (pi owns refresh) — no
# secrets are stored in this file or anywhere else by this script.
#
#   source bin/meta-env.sh   # then run any harness
#
# Provides:
#   MODEL_API_KEY            codex (model meta/muse-spark-1.3-contributor)
#   META_MUSE_API_KEY        reasonix provider, jcode-style consumers
#   HAX_OPENAI_BASE_URL/HAX_OPENAI_API_KEY[/HAX_OPENAI_MODEL]   hax openai-compatible
#   OPENAI_API_BASE/OPENAI_API_KEY + MSWEA_MODEL_NAME            mini-swe-agent (litellm)
set -uo pipefail
_META_TOKEN="$(node -e "console.log(require(process.env.HOME+'/.pi/agent/auth.json').meta.access)")"
export MODEL_API_KEY="$_META_TOKEN"
export META_MUSE_API_KEY="$_META_TOKEN"
export HAX_OPENAI_BASE_URL="https://api.meta.ai/v1"
export HAX_OPENAI_API_KEY="$_META_TOKEN"
export HAX_OPENAI_MODEL="muse-spark-1.3-contributor"
export OPENAI_API_BASE="https://api.meta.ai/v1"
export OPENAI_API_KEY="$_META_TOKEN"
export MSWEA_MODEL_NAME="openai/muse-spark-1.3-contributor"
unset _META_TOKEN
# NOTE: opencode (DB credential), jcode (login store), droid (settings.json),
# reasonix (.env), codex user-level MODEL_API_KEY are persisted separately.
# If the token expires, pi refreshes on next use — then re-run the persist
# steps (opencode/jcode/droid/reasonix) to re-bridge.
