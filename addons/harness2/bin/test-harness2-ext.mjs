#!/usr/bin/env node
// test-harness2-ext.mjs — harness2 harness battery: shim delegation, model env
// wiring (no raw .meta.access reads, no stored keys), sample config,
// meta-model docs, and minter probes.
// Run: node addons/harness2/bin/test-harness2-ext.mjs
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

check("installer mints live (no raw .meta.access, no stored key)", () => {
  const body = fs.readFileSync(path.join(ADDON, "install.mjs"), "utf8");
  assert.match(body, /meta-muse-key\.mjs/);
  assert.match(body, /META_API_KEY/);
  assert.match(body, /HARNESS2_JUDGE_API_KEY/);
  assert.match(body, /muse-spark-1\.3-contributor/);
  // Explanatory // comments may name .meta.access to forbid it; no CODE may read it.
  const code = body.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(code, /meta\.access/);
  assert.doesNotMatch(code, /auth\.json/);
  assert.doesNotMatch(body, /setx\("HARNESS2_JUDGE_API_KEY"|setx\('HARNESS2_JUDGE_API_KEY'/);
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
  const doc = fs.readFileSync(path.join(ADDON, "meta-model.harness2.md"), "utf8");
  assert.match(doc, /bin\/meta-muse-key\.mjs/);
  assert.match(doc, /muse-spark-1\.3-contributor/);
  assert.match(doc, /META_API_KEY/);
});

check("installer syntax valid", () => {
  const r = node(["--check", path.join(ADDON, "install.mjs")]);
  assert.equal(r.status, 0, r.stderr);
});

const health = await fetch("http://127.0.0.1:7778/health", { signal: AbortSignal.timeout(8000) });
assert.equal(health.ok, true, "HyperNexus kernel health endpoint is unavailable");
const status = await health.json();
passed += 1;
process.stdout.write(`PASS live kernel health (${status.version})\n`);

process.stdout.write(`\n${passed}/${passed} checks passed\n`);
