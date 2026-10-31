#!/usr/bin/env node
// Thin harness shim — canonical minter lives in addons/shared/bin/meta-muse-key.mjs.
// Keeps "node addons/freebuff/bin/meta-muse-key.mjs" working for existing docs/configs.
await import("../../shared/bin/meta-muse-key.mjs");
