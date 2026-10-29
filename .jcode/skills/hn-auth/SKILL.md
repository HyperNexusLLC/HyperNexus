---
name: hn-auth
description: "Check Meta muse-spark-1.3-contributor auth routes for Jcode (native muse-subscription + pi bridge + provider wiring). Trigger on '/hn-auth', 'meta auth', or 'muse login status'."
---

# /hn-auth

$ARGUMENTS

Report Meta auth readiness for `muse-spark-1.3-contributor` in Jcode. Check in
order, report each line as OK / MISSING / EXPIRED:

1. **Native route (primary)** — jcode-owned `~/.jcode/muse_subscription.json`
   exists (presence-check ONLY, never print contents). If present, the native
   profile works: `jcode -p muse-subscription -m muse-spark-1.3-contributor`.
   If missing, give the exact 3-step login:
   `$env:JCODE_EXPERIMENTAL_MUSE_SUBSCRIPTION='1'`,
   `jcode login --provider muse-subscription`, re-run.
2. **Bridge route (fallback)** — `node addons/jcode/bin/meta-muse-key.mjs --check`
   (live mint from pi `~/.pi/agent/auth.json`, key hidden). `--check` exit 0 =
   bridge ready; 401/403 = `/login meta` in pi again.
3. **Provider wiring** — `~/.jcode/config.toml` defaults
   (`default_model` / `default_provider`) and whether a `[providers.meta]`
   custom profile exists (see `addons/jcode/meta-model.jcode.toml`).
4. **Live proof (only with explicit user go-ahead)** — a real inference turn
   (`jcode run "Reply with exactly: OK" -p muse-subscription -m
   muse-spark-1.3-contributor`). Never run this silently: it spends real
   subscription/model usage.

Never display, copy, or persist any key or token. Never claim billing
treatment — a passing turn is not a billing receipt.
