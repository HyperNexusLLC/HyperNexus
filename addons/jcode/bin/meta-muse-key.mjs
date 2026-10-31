#!/usr/bin/env node
// Thin harness shim — canonical minter lives in addons/shared/bin/meta-muse-key.mjs.
// The hint preserves jcode's native-login fallback in reauth guidance.
process.env.META_REAUTH_HINT ??= " (or use jcode native: jcode login --provider muse-subscription)";
await import("../../shared/bin/meta-muse-key.mjs");
