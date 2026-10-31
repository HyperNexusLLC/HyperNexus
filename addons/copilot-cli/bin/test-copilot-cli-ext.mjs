#!/usr/bin/env node
// test-copilot-cli-ext.mjs — copilot-cli harness battery: shim delegation,
// installer wiring (dynamic exe/root, real skill sources), sample config,
// meta-model docs, and minter probes. Run: node addons/copilot-cli/bin/test-copilot-cli-ext.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ADDON = path.resolve(HERE, "..");
const ROOT = path.resolve(ADDON, "..", "..");
let passed = 0;

function check(name, run) {
  run();
  passed += 1;
  process.stdout.write(`PASS ${name}\n`);
}
function json(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function node(args, opts = {}) {
  return spawnSync(process.execPath, args, { encoding: "utf8", timeout: 60000, ...opts });
}

const SHIM = path.join(ADDON, "bin", "meta-muse-key.mjs");
const SHARED = path.join(ROOT, "addons", "shared", "bin", "meta-muse-key.mjs");

check("shim delegates to shared canonical minter", () => {
  const body = fs.readFileSync(SHIM, "utf8");
  assert.match(body, /shared\/bin\/meta-muse-key\.mjs/);
  assert.doesNotMatch(body, /api\.meta\.ai\/muse-code\/key/);
  assert.ok(fs.existsSync(SHARED), "canonical shared minter exists");
});

check("shim --help exits 0 with canonical usage", () => {
  const r = node([SHIM, "--help"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /--check|--doctor/);
});

check("shim --doctor probe reports a verdict", () => {
  const r = node([SHIM, "--doctor"]);
  assert.ok([0, 1, 2].includes(r.status), `unexpected exit ${r.status}: ${r.stderr}`);
  process.stdout.write(`  info doctor exit=${r.status} ${(r.stdout + r.stderr).split("\n")[0].slice(0, 100)}\n`);
});

check("shim --check probe reports mint state without leaking a key", () => {
  const r = node([SHIM, "--check"]);
  assert.ok([0, 1].includes(r.status), `unexpected exit ${r.status}`);
  assert.doesNotMatch(r.stdout, /[A-Za-z0-9_-]{24,}/);
  process.stdout.write(`  info check exit=${r.status}\n`);
});

check("installer resolves skills from the real plugin skill sources", () => {
  const src = path.join(ROOT, "addons", "copilot", "plugin", "hypernexus", "skills");
  for (const s of ["hypernexus", "hypernexus-ops", "hypernexus-workflows"]) {
    assert.ok(fs.existsSync(path.join(src, s, "SKILL.md")), `missing skill source ${s}`);
  }
  const body = fs.readFileSync(path.join(ADDON, "install.mjs"), "utf8");
  assert.match(body, /addons.*copilot.*plugin.*hypernexus.*skills/);
  assert.doesNotMatch(body, /["']C:\/Users\/hyper/);
  assert.match(body, /findKernel|HYPERNEXUS_BIN/);
});

check("installer has no hardcoded user paths", () => {
  for (const f of ["install.mjs", "mcp.json"]) {
    const body = fs.readFileSync(path.join(ADDON, f), "utf8");
    assert.doesNotMatch(body, /C:\/Users\/hyper\/workspace/);
  }
});

check("sample mcp.json is valid and portable", () => {
  const mcp = json(path.join(ADDON, "mcp.json"));
  const srv = mcp.mcpServers?.hypernexus;
  assert.ok(srv, "hypernexus server present");
  assert.deepEqual(srv.args, ["mcp"]);
  assert.equal(srv.env?.HYPERNEXUS_URL, "http://127.0.0.1:7778");
  assert.ok(typeof srv.env?.HYPERNEXUS_WORKSPACE_ROOT === "string");
});

check("meta-model doc documents the shim (not unwired env claims)", () => {
  const doc = fs.readFileSync(path.join(ADDON, "meta-model.copilot-cli.md"), "utf8");
  assert.match(doc, /bin\/meta-muse-key\.mjs/);
  assert.match(doc, /muse-spark-1\.3-contributor/);
});

check("installer syntax valid", () => {
  const r = node(["--check", path.join(ADDON, "install.mjs")]);
  assert.equal(r.status, 0, r.stderr);
});

check("installer install + check round-trips MCP and all 3 skills", () => {
  const inst = node([path.join(ADDON, "install.mjs")]);
  assert.equal(inst.status, 0, inst.stderr);
  assert.match(inst.stdout, /3\/3 skills/);
  const chk = node([path.join(ADDON, "install.mjs"), "--check"]);
  assert.equal(chk.status, 0, chk.stdout + chk.stderr);
  assert.match(chk.stdout, /CHECK OK/);
});

const health = await fetch("http://127.0.0.1:7778/health", { signal: AbortSignal.timeout(8000) });
assert.equal(health.ok, true, "HyperNexus kernel health endpoint is unavailable");
const status = await health.json();
passed += 1;
process.stdout.write(`PASS live kernel health (${status.version})\n`);

process.stdout.write(`\n${passed}/${passed} checks passed\n`);
