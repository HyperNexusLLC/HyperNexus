---
user-invocable: true
name: hn-models
description: "List models available to this Codex session (verifies meta/muse-spark-1.3-contributor)."
---

# /skill:hn-models

Verify the Meta model is selectable:

1. Confirm `config.toml` has `model = "meta/muse-spark-1.3-contributor"` and `[model_providers.meta]` with `base_url = "http://127.0.0.1:7778/v1"`, `env_key = "MODEL_API_KEY"`, `wire_api = "responses"`.
2. Confirm `MODEL_API_KEY` is set in this shell (name only): `node addons/codex/bin/meta-muse-key.mjs --check` should report mint OK.
3. Report OK when both hold; otherwise point at `/skill:hn-auth` and `use-meta-model.ps1`.

Shell surfaces stay off on the Meta path (`--disable shell_tool --disable unified_exec --disable goals`); shell-equivalent work goes through the hypernexus MCP parity tools (`code_interpreter`, `read`, `write`, `edit`, `find`, `grep`, `ls`).
