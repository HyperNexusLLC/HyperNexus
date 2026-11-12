#!/usr/bin/env node
// Thin harness shim — canonical minter lives in addons/shared/bin/meta-muse-key.mjs.
// Codewhale cannot read pi's auth.json natively, so mint via the shared minter
// (reads meta.refresh -> POST api.meta.ai/muse-code/key, stdout=key only).
await import("../../shared/bin/meta-muse-key.mjs");
