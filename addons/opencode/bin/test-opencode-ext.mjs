#!/usr/bin/env node
// HyperNexus OpenCode integration — minimal static battery (no kernel needed).
// Verifies: shared-minter thin shim, V2 meta-model config (no secrets), plugin
// surfaces (tools/commands/skills/agent/hooks/MCP), installer, and that no
// shell tool is registered by default. Run: node addons/opencode/bin/test-opencode-ext.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const OC = path.join(ROOT, "addons", "opencode");
let passed = 0;

function check(name, run) {
  run();
  passed += 1;
  process.stdout.write(`PASS ${name}\n`);
}

function src(rel) {
  return fs.readFileSync(path.join(OC, rel), "utf8");
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

check("V2 meta-model config pins meta/muse-spark with env key", () => {
  const cfg = src("meta-model.opencode.jsonc");
  assert.match(cfg, /"meta"/);
  assert.match(cfg, /muse-spark-1\.3-contributor/);
  assert.match(cfg, /META_MUSE_API_KEY/);
  assert.match(cfg, /api\.meta\.ai\/v1/);
  assert.doesNotMatch(cfg, /"key"\s*:/);
});

check("plugin registers tools incl meta_auth", () => {
  const plugin = src(path.join("plugin", "hypernexus", "index.js"));
  assert.match(plugin, /const TOOLS = \[/);
  assert.match(plugin, /name: "meta_auth"/);
  assert.match(plugin, /redactMetaKey|REDACTED/);
});

check("plugin registers all 13 hn-* commands", () => {
  const plugin = src(path.join("plugin", "hypernexus", "index.js"));
  const cmds = plugin.match(/name: "hn-[a-z-]+"/g) || [];
  assert.equal(cmds.length, 13, `expected 13 hn-* commands, found ${cmds.length}: ${cmds.join(",")}`);
});

check("plugin exports V2 setup plus V1 server shim", () => {
  const plugin = src(path.join("plugin", "hypernexus", "index.js"));
  assert.match(plugin, /export \{[^}]*setup[^}]*server[^}]*\}/);
});

check("no shell tool registered by default", () => {
  const plugin = src(path.join("plugin", "hypernexus", "index.js"));
  assert.doesNotMatch(plugin, /name:\s*"(bash|powershell)"/);
});

check("skills, agent, and reminders are packaged", () => {
  for (const skill of ["hypernexus", "hypernexus-ops", "hypernexus-workflows", "hypernexus-orchestrator"]) {
    const text = src(path.join("skills", skill, "SKILL.md"));
    assert.match(text, new RegExp(`name:\\s*${skill}`));
    assert.match(text, /description:\s*.+/);
  }
  assert.ok(fs.existsSync(path.join(OC, "agent", "hypernexus-orchestrator.md")));
  for (const reminder of ["hn-memory-first.md", "hn-verify-ops.md"]) {
    assert.ok(fs.existsSync(path.join(OC, "reminders", reminder)));
  }
});

check("installer and launcher hide the minted key", () => {
  assert.ok(fs.existsSync(path.join(OC, "install.mjs")));
  const launcher = src("use-meta-model.ps1");
  assert.match(launcher, /muse-spark-1\.3-contributor/);
  assert.match(launcher, /value hidden/);
  assert.match(launcher, /Remove-Variable -Name minted/);
  assert.match(launcher, /bin\\meta-muse-key\.mjs/);
  assert.match(src("README.md"), /meta-muse-key\.mjs --check/);
});

check("README documents install, config, and meta model", () => {
  const readme = src("README.md");
  assert.match(readme, /install\.mjs/);
  assert.match(readme, /muse-spark-1\.3-contributor/);
  assert.match(readme, /META_MUSE_API_KEY/);
});

process.stdout.write(`\n${passed}/${passed} checks passed\n`);
