---
name: hn-models
description: "List models available to Jcode through the live catalog (Meta subscription + configured providers). Trigger on '/hn-models', 'list models', or 'what models'."
---

# /hn-models [provider]

$ARGUMENTS

Show what this Jcode can actually run — live data, never a guessed list:

1. Meta subscription catalog (only if the native credential exists — otherwise
   say so and point at `/hn-auth`): `GET https://api.meta.ai/muse-code/models`
   with the minted key returns the account's 7 models including
   `muse-spark-1.3`, `muse-wonder-1.0`, `muse-image-1.0` and contributor
   variants. Reach it via `mcp__hypernexus__mcp_call_tool` or plain HTTP.
2. Configured providers from `~/.jcode/config.toml` (`[providers.*]` blocks +
   `[[providers.*.models]]` entries).
3. Present: provider, model id, context window when published. Mark
   `muse-spark-1.3-contributor` explicitly (deliberate selection — contributor
   models have content-use implications).

Never fabricate a model id or context limit. If the kernel is down, read the
local config file directly.
