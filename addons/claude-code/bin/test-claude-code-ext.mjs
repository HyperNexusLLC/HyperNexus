#!/usr/bin/env node
// HyperNexus Claude Code integration — minimal static battery (no kernel needed).
// Verifies: shared-minter thin shim, native meta-model wiring (no secrets),
// plugin surfaces (commands/skills/agents/hooks/MCP), installer, launcher,
// and that no shell tool ships in the default docs (attestation 403 policy).
// Run: node addons/claude-code/bin/test-claude-code-ext.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const CC = path.join(ROOT, "addons", "claude-code");
const PLUGIN = path.join(CC, "plugin", "hypernexus");
let passed = 0;

function check(name, run) {
  run();
  passed += 1;
  process.stdout.write(`PASS ${name}\n`);
}

function src(rel) {
  return fs.readFileSync(path.join(CC, rel), "utf8");
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

check("meta wiring pins muse-spark-1.3-contributor with no secrets", () => {
  const snippet = src("meta-model.settings.snippet");
  assert.match(snippet, /muse-spark-1\.3-contributor/);
  assert.match(snippet, /ANTHROPIC_BASE_URL/);
  assert.match(snippet, /127\.0\.0\.1:7778/);
  assert.match(snippet, /bin\/meta-muse-key\.mjs --check/);
  assert.doesNotMatch(snippet, /sk-[A-Za-z0-9]{8,}/);
});

check("plugin.json declares commands/skills/agents/hooks/mcpServers", () => {
  const raw = fs.readFileSync(path.join(PLUGIN, ".claude-plugin", "plugin.json"), "utf8");
  const plugin = JSON.parse(raw);
  assert.equal(plugin.name, "hypernexus");
  assert.match(String(plugin.commands), /commands/);
  assert.match(String(plugin.skills), /skills/);
  assert.ok(Array.isArray(plugin.agents) && plugin.agents.length === 2);
  assert.match(String(plugin.hooks), /hooks\.json/);
  assert.match(String(plugin.mcpServers), /\.mcp\.json/);
});

check("3 skills + 2 agents are packaged", () => {
  for (const skill of ["hypernexus", "hypernexus-ops", "hypernexus-workflows"]) {
    const text = fs.readFileSync(path.join(PLUGIN, "skills", skill, "SKILL.md"), "utf8");
    assert.match(text, new RegExp(`name:\\s*${skill}`));
    assert.match(text, /description:\s*.+/);
  }
  for (const agent of ["hypernexus-orchestrator.md", "hypernexus-researcher.md"]) {
    assert.ok(fs.existsSync(path.join(PLUGIN, "agents", agent)), `missing agent ${agent}`);
  }
});

check("Bash gate is a deny-list guard, not a shell allowlist", () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(PLUGIN, "hooks", "hooks.json"), "utf8"));
  const pre = hooks.hooks?.PreToolUse;
  assert.ok(Array.isArray(pre) && pre.length > 0, "expected a PreToolUse entry");
  assert.match(JSON.stringify(pre), /hn-gate\.mjs/);
  const gate = fs.readFileSync(path.join(PLUGIN, "hooks", "scripts", "hn-gate.mjs"), "utf8");
  assert.match(gate, /rm\s/);
  assert.match(gate, /decision/);
});

check("no shell tool in default docs (attestation 403 policy)", () => {
  const overlay = src("prompt-overlay.md");
  assert.doesNotMatch(overlay, /\| files\/shell \|/);
  assert.match(overlay, /code_interpreter/);
  assert.match(overlay, /client_attestation_denied/);
  const skill = fs.readFileSync(path.join(PLUGIN, "skills", "hypernexus", "SKILL.md"), "utf8");
  assert.doesNotMatch(skill, /^\|[^|]*\b(bash|powershell)\b[^|]*\|/m);
  assert.match(skill, /code_interpreter/);
  assert.match(skill, /client_attestation_denied/);
});

check("installer and launcher hide the minted key", () => {
  assert.ok(fs.existsSync(path.join(CC, "install.mjs")));
  const launcher = src("use-meta-model.ps1");
  assert.match(launcher, /muse-spark-1\.3-contributor/);
  assert.match(launcher, /meta-muse-key\.mjs/);
  assert.doesNotMatch(launcher, /sk-[A-Za-z0-9]{8,}/);
  assert.match(src("README.md"), /meta-muse-key\.mjs --check/);
});

check("README documents install, meta model, and this battery", () => {
  const readme = src("README.md");
  assert.match(readme, /install\.mjs/);
  assert.match(readme, /muse-spark-1\.3-contributor/);
  assert.match(readme, /test-claude-code-ext\.mjs/);
  assert.match(readme, /Shell policy/);
});

process.stdout.write(`\n${passed}/${passed} checks passed\n`);
