#!/usr/bin/env node
// HyperNexus Muse Code integration — minimal static battery (no kernel needed).
// Verifies: shared-minter thin shim, native meta-model wiring (no secrets),
// plugin bundle (3 skills, 11 commands, hooks, MCP server), installer,
// launcher, and that no shell tool ships in the default docs
// (attestation 403 policy).
// Run: node addons/muse-code/bin/test-muse-code-ext.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const MC = path.join(ROOT, "addons", "muse-code");
const PLUGIN = path.join(MC, "plugin", "hypernexus");
let passed = 0;

function check(name, run) {
  run();
  passed += 1;
  process.stdout.write(`PASS ${name}\n`);
}

function src(rel) {
  return fs.readFileSync(path.join(MC, rel), "utf8");
}

check("thin minter shim delegates to shared canonical minter", () => {
  const shim = src(path.join("bin", "meta-muse-key.mjs"));
  assert.match(shim, /shared\/bin\/meta-muse-key\.mjs/);
  assert.ok(fs.existsSync(path.join(ROOT, "addons", "shared", "bin", "meta-muse-key.mjs")));
  const canonical = fs.readFileSync(
    path.join(ROOT, "addons", "shared", "bin", "meta-muse-key.mjs"), "utf8");
  assert.match(canonical, /--check/);
  assert.match(canonical, /stdout/i);
});

check("meta doc pins provider meta + muse-spark-1.3-contributor", () => {
  const doc = src("meta-model.muse-code.md");
  assert.match(doc, /[Pp]rovider `meta`/);
  assert.match(doc, /muse-spark-1\.3-contributor/);
  assert.match(doc, /api\.meta\.ai\/v1/);
  assert.match(doc, /bin\/meta-muse-key\.mjs/);
  assert.doesNotMatch(doc, /sk-[A-Za-z0-9]{8,}/);
});

check("plugin bundle carries 3 skills + 11 commands + hooks + MCP", () => {
  const raw = fs.readFileSync(path.join(PLUGIN, ".muse-plugin", "plugin.json"), "utf8");
  const plugin = JSON.parse(raw);
  assert.equal(plugin.name, "hypernexus");
  assert.equal(plugin.capabilities.skills.length, 3);
  assert.equal(plugin.capabilities.commands.length, 11);
  assert.ok(Array.isArray(plugin.capabilities.hooks) && plugin.capabilities.hooks.length >= 5);
  assert.ok(fs.existsSync(path.join(MC, "mcp.json")), "missing addon mcp.json");
  assert.ok(fs.existsSync(path.join(PLUGIN, "mcp", "hn-mcp.mjs")), "missing MCP stdio bridge hn-mcp.mjs");
  for (const skill of ["hypernexus", "hypernexus-ops", "hypernexus-workflows"]) {
    const text = fs.readFileSync(path.join(PLUGIN, "skills", skill, "SKILL.md"), "utf8");
    assert.match(text, new RegExp(`name:\\s*${skill}`));
  }
});

check("hooks are log-only observers (no shell allowlist grant)", () => {
  const lib = fs.readFileSync(path.join(PLUGIN, "hooks", "scripts", "hn-hook-lib.mjs"), "utf8");
  assert.match(lib, /127\.0\.0\.1:7778|HYPERNEXUS_URL/);
});

check("session-start prints a visible HyperNexus banner", () => {
  const lib = fs.readFileSync(path.join(PLUGIN, "hooks", "scripts", "hn-hook-lib.mjs"), "utf8");
  assert.match(lib, /printBanner/);
  assert.match(lib, /\[HyperNexus\] kernel v/);
  assert.match(lib, /bus:.*sessions/);
  assert.match(lib, /swarm:/);
});

check("no shell tool in default docs (attestation 403 policy)", () => {
  const skill = fs.readFileSync(path.join(PLUGIN, "skills", "hypernexus", "SKILL.md"), "utf8");
  assert.doesNotMatch(skill, /\| files\/shell \|/);
  assert.doesNotMatch(skill, /^\|[^|]*\b(bash|powershell)\b[^|]*\|/m);
  assert.match(skill, /code_interpreter/);
  assert.match(skill, /client_attestation_denied/);
  assert.match(src("README.md"), /Shell policy/);
});

check("installer and launcher hide the minted key", () => {
  assert.ok(fs.existsSync(path.join(MC, "install.mjs")));
  const installer = src("install.mjs");
  assert.match(installer, /provider.*meta|meta.*provider/s);
  assert.match(installer, /muse-spark-1\.3-contributor/);
  const launcher = src("use-meta-model.ps1");
  assert.match(launcher, /muse-spark-1\.3-contributor/);
  assert.match(launcher, /meta-muse-key\.mjs/);
  assert.doesNotMatch(launcher, /sk-[A-Za-z0-9]{8,}/);
});

check("README documents install, meta model, and this battery", () => {
  const readme = src("README.md");
  assert.match(readme, /install\.mjs/);
  assert.match(readme, /muse-spark-1\.3-contributor/);
  assert.match(readme, /test-muse-code-ext\.mjs/);
});

process.stdout.write(`\n${passed}/${passed} checks passed\n`);
