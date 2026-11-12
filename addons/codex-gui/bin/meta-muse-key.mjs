#!/usr/bin/env node
// Thin shim to canonical shared minter; pi owns OAuth refresh.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const shared = path.resolve(here, "..", "..", "shared", "bin", "meta-muse-key.mjs");
process.stdout.write(execFileSync(process.execPath, [shared, ...process.argv.slice(2)], { encoding: "utf8" }));
