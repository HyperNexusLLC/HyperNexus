# Meta model for Muse Code

Provider `meta`, model `muse-spark-1.3-contributor`, endpoint `https://api.meta.ai/v1`.
OAuth subscription lives in pi (`~/.pi/agent/auth.json`); this harness consumes it
via live mint per shell — see `bin/meta-muse-key.mjs` and `use-meta-model.ps1`.

- Mint: `node bin/meta-muse-key.mjs` prints ONLY the key (stdout helper pattern,
  same flow as droid/freebuff: `META_AUTH_PATH` default `~/.pi/agent/auth.json`,
  `POST https://api.meta.ai/muse-code/key`, `--check` hides the key).
- Shell: `$env:META_API_KEY = node bin/meta-muse-key.mjs` — `META_API_KEY` always
  takes priority over account login. Never store it; pi owns refresh (401/403 =
  `/login meta` in pi).
- `muse --provider meta --model muse-spark-1.3-contributor` pins the model per run;
  `~/.config/muse/settings.json` pins it by default (installer ensures it).
