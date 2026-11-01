#!/usr/bin/env node
// HyperNexus pi extension — minimal static battery (no kernel, no ~/.pi needed).
// Verifies: extension source surfaces, MCP snippet, model-pin docs, installer,
// and that no default tool allowlist grants bash/powershell (shell needs route
// through HyperNexus parity tools). Run: node addons/pi/bin/test-pi-ext.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const PI = path.join(ROOT, "addons", "pi");
let passed = 0;

function check(name, run) {
  run();
  passed += 1;
  process.stdout.write(`PASS ${name}\n`);
}

function src(name) {
  return fs.readFileSync(path.join(PI, name), "utf8");
}

const ext = src("hypernexus.ts");

check("extension imports pi ExtensionAPI", () => {
  assert.match(ext, /from "@earendil-works\/pi-coding-agent"/);
  assert.match(ext, /ExtensionAPI/);
});

check("extension registers hypernexus_* tools", () => {
  const tools = ext.match(/name: "hypernexus_[a-z_]+"/g) || [];
  assert.ok(tools.length >= 30, `expected >=30 hypernexus_* tools, found ${tools.length}`);
});

check("extension registers all 12 tn-* commands", () => {
  for (const cmd of ["tn-store", "tn-search", "tn-status", "tn-plan", "tn-purge",
    "tn-summary", "tn-orchestrate", "tn-tools", "tn-session",
    "tn-context", "tn-remember", "tn-restore"]) {
    assert.ok(ext.includes(`registerCommand("${cmd}"`), `missing /${cmd}`);
  }
});

check("kernel calls are budgeted with FTS fast path", () => {
  assert.match(ext, /AbortSignal\.timeout/);
  assert.match(ext, /TN_FAST_TIMEOUT_MS/);
  assert.match(ext, /\/api\/memory\/fts-search/);
});

check("no default tool allowlist grants bash/powershell", () => {
  assert.doesNotMatch(ext, /allowedTools|allowlist/i);
  assert.doesNotMatch(ext, /name:\s*"(bash|powershell)"/);
});

check("mcp.pi.json exposes hypernexus MCP server", () => {
  const mcp = JSON.parse(src("mcp.pi.json"));
  assert.ok(mcp.mcpServers?.hypernexus);
  assert.match(mcp.mcpServers.hypernexus.command, /hypernexus/);
  assert.match(mcp.mcpServers.hypernexus.args.join(" "), /mcp/);
});

check("meta-model pin is documented (pi owns OAuth)", () => {
  const doc = src("meta-model.pi.md");
  assert.match(doc, /muse-spark-1\.3-contributor/);
  assert.match(doc, /defaultProvider.*meta|meta.*defaultProvider/);
  assert.match(doc, /\/login meta/);
});

check("installer pins and verifies the meta model", () => {
  const inst = src("install.mjs");
  assert.match(inst, /muse-spark-1\.3-contributor/);
  assert.match(inst, /defaultProvider/);
  assert.match(inst, /hypernexus\.ts/);
});

check("launcher verifies pin only and never edits config", () => {
  const launcher = src("use-meta-model.ps1");
  assert.match(launcher, /muse-spark-1\.3-contributor/);
  assert.doesNotMatch(launcher, /Set-Content|Out-File|>|ConvertTo-Json/);
});

check("README documents install and model", () => {
  const readme = src("README.md");
  assert.match(readme, /install\.mjs/);
  assert.match(readme, /muse-spark-1\.3-contributor/);
});

process.stdout.write(`\n${passed}/${passed} checks passed\n`);
