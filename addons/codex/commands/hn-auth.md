---
user-invocable: true
name: hn-auth
description: "Meta muse-spark auth status from Codex — mint check without showing key values."
---

# /skill:hn-auth [check]

Meta subscription auth status (never prints key values):

1. Run `node addons/codex/bin/meta-muse-key.mjs --check` — expect `mint OK (key hidden)`.
2. Report: provider `meta/muse-wonder-1.0-contributor` @ `http://127.0.0.1:7778/v1`, pi OAuth identity present/absent, `MODEL_API_KEY` set/unset (name only, never the value).
3. If mint reports expired session (401/403), instruct: run `/login meta` in pi, then re-mint.

This file and the installer NEVER write the token or key anywhere. auth.json is read at call time, every time.
