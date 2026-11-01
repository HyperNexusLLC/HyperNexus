#!/usr/bin/env node
// Thin harness shim — canonical minter lives in addons/shared/bin/meta-muse-key.mjs.
// Keeps "node addons/grok/bin/meta-muse-key.mjs" working for existing docs/configs.
await import("../../shared/bin/meta-muse-key.mjs");
