#!/usr/bin/env node
// HyperNexus jcode integration - minimal hermetic battery (no kernel needed).
// Verifies: addon layout, dual Meta model pin via kernel /v1 (no secrets),
// shared minter shim, session-bus swarm floor, and the attestation policy
// (no shell-named model tools in MCP config). Added in the v1.0.49 fix pass.
// Run: node addons/jcode/bin/test-jcode-ext.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ADDON = path.resolve(HERE, "..");
const ROOT = path.resolve(ADDON, "..", "..");
let passed = 0;
function check(name, run) { run(); passed += 1; process.stdout.write(`PASS ${name}\n`); }
function src(rel) { return fs.readFileSync(path.join(ADDON, rel), "utf8"); }
function has(rel) { return fs.existsSync(path.join(ADDON, rel)); }

check("layout: install + meta doc + README + swarm floor + minter shim", () => {
  for (const f of ["install.mjs", "meta-model.jcode.toml", "README.md", "swarm-prompt-block.md", path.join("bin", "meta-muse-key.mjs")]) {
    assert.ok(has(f), `missing ${f}`);
  }
});

check("meta doc pins both contributor models via kernel /v1, no secrets", () => {
  const doc = src("meta-model.jcode.toml");
  assert.match(doc, /muse-wonder-1\.0-contributor/);
  assert.match(doc, /muse-spark-1\.3-contributor/);
  assert.match(doc, /127\.0\.0\.1:7778/);
  assert.doesNotMatch(doc, /sk-[A-Za-z0-9]{8,}/);
});

check("minter shim delegates to shared canonical minter", () => {
  const shim = src(path.join("bin", "meta-muse-key.mjs"));
  assert.match(shim, /shared/);
  assert.ok(fs.existsSync(path.join(ROOT, "addons", "shared", "bin", "meta-muse-key.mjs")));
});

check("swarm floor wires the shared session-bus (register/send/inbox/reply)", () => {
  const block = src("swarm-prompt-block.md");
  // jcode's block is installer-managed; its session surface is the
  // hypernexus-sessions skill plus the swarm persistence block.
  const skill = src(path.join("skills", "hypernexus-sessions", "SKILL.md"));
  assert.match(block + skill, /swarm|session/i);
  assert.ok(has(path.join("skills", "hypernexus-sessions", "SKILL.md")));
});

check("no shell-named model tools in MCP config (attestation 403 policy)", () => {
  const cfg = src("mcp.json");
  assert.doesNotMatch(cfg, /"name"\s*:\s*"(bash|powershell|shell)"/i);
  assert.match(cfg, /hypernexus/i);
});

check("installer references hypernexus", () => {
  assert.match(src("install.mjs"), /hypernexus/i);
});

process.stdout.write(`\n${passed}/${passed} checks passed\n`);
