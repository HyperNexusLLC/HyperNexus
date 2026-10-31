#!/usr/bin/env node
// test-codex-cli-ext.mjs — codex-cli harness battery: shim delegation,
// installer wiring (META_API_KEY provider block, canonical skill fallback,
// sample config), meta-model docs, and minter probes.
// Install round-trip runs against a temp CODEX_HOME (never the real one).
// Run: node addons/codex-cli/bin/test-codex-cli-ext.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
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

check("installer uses META_API_KEY union key + canonical skill fallback", () => {
  const body = fs.readFileSync(path.join(ADDON, "install.mjs"), "utf8");
  assert.match(body, /env_key = "META_API_KEY"/);
  assert.doesNotMatch(body, /env_key = "MODEL_API_KEY"/);
  assert.match(body, /\.agents.*skills|CANON_SKILLS/);
  assert.doesNotMatch(body, /C:\/Users\/hyper\/workspace/);
});

check("sample mcp.json is valid and portable", () => {
  const mcp = json(path.join(ADDON, "mcp.json"));
  const srv = mcp.mcpServers?.hypernexus;
  assert.ok(srv, "hypernexus server present");
  assert.deepEqual(srv.args, ["mcp"]);
  assert.equal(srv.env?.HYPERNEXUS_URL, "http://127.0.0.1:7778");
  assert.ok(typeof srv.env?.HYPERNEXUS_WORKSPACE_ROOT === "string");
});

check("meta-model doc documents META_API_KEY + shim", () => {
  const doc = fs.readFileSync(path.join(ADDON, "meta-model.codex-cli.md"), "utf8");
  assert.match(doc, /bin\/meta-muse-key\.mjs/);
  assert.match(doc, /muse-spark-1\.3-contributor/);
  assert.match(doc, /META_API_KEY/);
});

check("installer install + check round-trips into temp CODEX_HOME", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hn-codex-cli-"));
  const env = { ...process.env, CODEX_HOME: tmp };
  const inst = node([path.join(ADDON, "install.mjs")], { env });
  assert.equal(inst.status, 0, inst.stderr);
  assert.match(inst.stdout, /META_API_KEY/);
  const cfg = fs.readFileSync(path.join(tmp, "config.toml"), "utf8");
  assert.match(cfg, /muse-spark-1\.3-contributor/);
  assert.match(cfg, /\[model_providers\.meta\]/);
  assert.match(cfg, /env_key = "META_API_KEY"/);
  assert.match(cfg, /\[mcp_servers\.hypernexus\]/);
  for (const n of ["hypernexus", "hypernexus-ops", "hypernexus-workflows"]) {
    const f = path.join(tmp, "skills", n, "SKILL.md");
    assert.ok(fs.existsSync(f) && fs.statSync(f).size > 100, `missing skill ${n}`);
  }
  for (const n of ["hn-status", "hn-search", "hn-store", "hn-session", "hn-context", "hn-summary", "hn-tools", "hn-purge"]) {
    assert.ok(fs.existsSync(path.join(tmp, "skills", n, "SKILL.md")), `missing command-skill ${n}`);
  }
  for (const h of ["hn-session.sh", "hn-rbac.sh", "hn-pre-tool.sh"]) {
    assert.ok(fs.existsSync(path.join(tmp, "hooks", h)), `missing hook ${h}`);
  }
  const chk = node([path.join(ADDON, "install.mjs"), "--check"], { env });
  assert.equal(chk.status, 0, chk.stdout + chk.stderr);
  assert.match(chk.stdout, /CHECK OK/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

const health = await fetch("http://127.0.0.1:7778/health", { signal: AbortSignal.timeout(8000) });
assert.equal(health.ok, true, "HyperNexus kernel health endpoint is unavailable");
const status = await health.json();
passed += 1;
process.stdout.write(`PASS live kernel health (${status.version})\n`);

process.stdout.write(`\n${passed}/${passed} checks passed\n`);
