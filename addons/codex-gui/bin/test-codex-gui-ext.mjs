#!/usr/bin/env node
// HyperNexus codex-gui extension - hermetic battery (no kernel, no network).
// Run: node addons/codex-gui/bin/test-codex-gui-ext.mjs [--live]
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const DIR = path.join(ROOT, "addons", "codex-gui");
let passed = 0;
function check(name, fn) { fn(); passed += 1; process.stdout.write("PASS " + name + "\n"); }
function src(f) { return fs.readFileSync(path.join(DIR, f), "utf8"); }
check("connection pins meta model via kernel proxy", () => {
  const c = JSON.parse(src("connection.json"));
  assert.equal(c.model, "meta/muse-wonder-1.0-contributor");
  assert.match(c.baseUrl, /127\.0\.0\.1:7778\/v1/);
  assert.ok(c.envKey, "envKey required");
});
check("mcp.json registers hypernexus stdio server", () => {
  const m = JSON.parse(src("mcp.json"));
  const srv = m.mcpServers && m.mcpServers.hypernexus;
  assert.ok(srv, "mcpServers.hypernexus required");
  assert.match(srv.command || "", /hypernexus/);
  assert.equal(srv.env && srv.env.HYPERNEXUS_URL, "http://127.0.0.1:7778");
});
check("minter shim delegates to canonical shared minter", () => {
  const s = src("bin/meta-muse-key.mjs");
  assert.match(s, /shared.*meta-muse-key/);
  assert.ok(!/refresh|api_key/i.test(s.replace(/OAuth refresh/g, "")), "shim must not embed secrets");
});
check("meta-model doc pins model + 403 guard, no secrets", () => {
  const d = src("meta-model.codex-gui.md");
  assert.match(d, /meta\/muse-wonder-1.0-contributor/);
  assert.match(d, /client_attestation_denied/);
  assert.match(d, /MINIMAL|minimal/i);
});
check("installer supports install/check/uninstall", () => {
  const i = src("install.mjs");
  assert.match(i, /--check/); assert.match(i, /--uninstall/); assert.match(i, /--global/);
});
check("README documents model, mcp, parity policy", () => {
  const r = src("README.md");
  assert.match(r, /muse-wonder-1.0-contributor/);
  assert.match(r, /parity tools/);
  assert.match(r, /shell tools disabled/i);
});
check("skills + commands + swarm present", () => {
  assert.ok(fs.existsSync(path.join(DIR, "skills", "hypernexus", "SKILL.md")), "skills/hypernexus/SKILL.md");
  assert.ok(fs.existsSync(path.join(DIR, "commands", "hn-status.md")), "commands/hn-status.md");
  assert.ok(fs.existsSync(path.join(DIR, "commands", "hn-swarm.md")), "commands/hn-swarm.md");
  assert.ok(fs.existsSync(path.join(DIR, "commands", "hn-report.md")), "commands/hn-report.md");
  assert.ok(fs.existsSync(path.join(DIR, "skills", "hypernexus-orchestrator", "SKILL.md")), "skills/hypernexus-orchestrator/SKILL.md");
  assert.ok(fs.existsSync(path.join(DIR, "agent", "swarm-leader.md")), "agent/swarm-leader.md");
  assert.ok(fs.existsSync(path.join(DIR, "agent", "swarm-worker.md")), "agent/swarm-worker.md");
  assert.ok(fs.existsSync(path.join(DIR, "prompt-overlay.md")), "prompt-overlay.md");
});
check("no shell tool names in mcp/connection config", () => {
  const all = src("mcp.json") + src("connection.json");
  assert.ok(!/"bash"|"powershell"/.test(all), "shell tool names must not appear in config");
});
if (process.argv.includes("--live")) {
  const health = await (await fetch("http://127.0.0.1:7778/health")).json();
  assert.equal(health.ok, true);
  process.stdout.write("PASS live kernel health (" + health.version + ")\n");
  passed += 1;
}
process.stdout.write("RESULT pass=" + passed + " fail=0\n");


