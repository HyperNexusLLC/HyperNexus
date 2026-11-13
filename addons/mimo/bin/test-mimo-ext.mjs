#!/usr/bin/env node
// HyperNexus mimo (MiMoCode) integration - hermetic battery (no kernel needed).
// Verifies: addon layout, plugin tool surface (33 typed tools incl. the pi
// ports hypernexus_workflow/orchestrate/browser), MCP config (stdio, no
// shell-named tools - attestation 403 policy), meta doc model pins, skills.
// Run: node addons/mimo/bin/test-mimo-ext.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ADDON = path.resolve(HERE, "..");
const ROOT = path.resolve(ADDON, "..", "..");
let passed = 0;
function check(name, run) { run(); passed += 1; process.stdout.write(`PASS ${name}\n`); }
function src(rel) { return fs.readFileSync(path.join(ADDON, rel), "utf8"); }
function has(rel) { return fs.existsSync(path.join(ADDON, rel)); }

check("layout: install + meta doc + README + mcp + plugin + minter shim", () => {
  for (const f of ["install.js", "meta-model.mimo.md", "README.md", "mcp.json",
    path.join("plugin", "hypernexus", "index.js"), path.join("plugin", "hypernexus", "package.json"),
    path.join("bin", "meta-muse-key.mjs")]) assert.ok(has(f), `missing ${f}`);
});

check("plugin parses (node --check)", () => {
  execFileSync(process.execPath, ["--check", path.join(ADDON, "plugin", "hypernexus", "index.js")]);
});

check("plugin exposes 33 typed tools incl. pi ports workflow/orchestrate/browser", () => {
  const plugin = src(path.join("plugin", "hypernexus", "index.js"));
  const defs = plugin.match(/hypernexus_\w+: tool\(/g) || [];
  assert.ok(defs.length >= 33, `only ${defs.length} tool defs`);
  for (const t of ["hypernexus_workflow", "hypernexus_orchestrate", "hypernexus_browser",
    "hypernexus_memory_search", "hypernexus_search_tools", "hypernexus_status"]) {
    assert.ok(plugin.includes(`${t}: tool(`), `missing ${t}`);
  }
});

check("mcp config: stdio hypernexus, no shell-named tools, no secrets", () => {
  const mcp = src("mcp.json");
  assert.match(mcp, /"hypernexus"/);
  assert.match(mcp, /127\.0\.0\.1:7778/);
  assert.doesNotMatch(mcp, /"(bash|powershell|shell|exec)"/i);
  assert.doesNotMatch(mcp, /sk-[A-Za-z0-9]{8,}/);
});

check("meta doc pins contributor model via kernel /v1, no secrets", () => {
  const doc = src("meta-model.mimo.md");
  assert.match(doc, /muse-(wonder|spark)-1\.[03]-contributor/);
  assert.match(doc, /127\.0\.0\.1:7778\/v1/);
  assert.doesNotMatch(doc, /sk-[A-Za-z0-9]{8,}/);
});

check("skills + mimocode commands present", () => {
  for (const f of [path.join("skills", "hypernexus", "SKILL.md"),
    path.join("mimocode", "commands", "hn-status.md"),
    path.join("mimocode", "commands", "hn-search.md")]) assert.ok(has(f), `missing ${f}`);
});

check("minter shim present and shared canonical minter exists", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "addons", "shared", "bin", "meta-muse-key.mjs")));
});

process.stdout.write(`\n${passed} hermetic checks passed\n`);
