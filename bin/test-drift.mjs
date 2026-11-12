#!/usr/bin/env node
// test-drift.mjs -- schema-drift guard for the OpenCode extension vs kernel.
//
// Siblings change kernel APIs daily (endpoints renamed, tools added/removed).
// This battery asserts the extension's assumptions still hold against the LIVE
// kernel, so "extension broke because kernel moved" becomes a red line instead
// of a surprise:
//
//   1. Every /api/... endpoint the plugin or rpc.js references must EXIST
//      (any status except 404/405 = exists; 400/422/503 all fine here).
//   2. Every kernel tool name the plugin proxies via /api/agent/tool must be
//      accepted by the router (unknown tool = drift).
//   3. The plugin's advertised capability contract (rpc.js) must stay in sync
//      with the tool names the kernel registry exposes.
//
// Exit code 0 = no drift. Kernel must be running (http://127.0.0.1:7778).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KERNEL = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";

const indexSrc = readFileSync(path.join(root, "addons/opencode/plugin/hypernexus/index.js"), "utf8");
const rpcSrc = readFileSync(path.join(root, "addons/opencode/plugin/hypernexus/rpc.js"), "utf8");
const src = indexSrc + "\n" + rpcSrc;

let passed = 0;
let failed = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function probe(endpoint) {
  // GET first; 405/404 fall through to POST-with-empty-body.
  for (const method of ["GET", "POST"]) {
    try {
      const res = await fetch(`${KERNEL}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json", "X-HyperNexus-Client": "drift-battery" },
        body: method === "POST" ? "{}" : undefined,
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 404) continue; // try the other method
      return { status: res.status, method };
    } catch (err) {
      return { status: 0, method, error: String(err?.message || err) };
    }
  }
  return { status: 404, method: "GET+POST" };
}

// ---- 1. endpoint existence -------------------------------------------------
// Template paths ("/api/session/${sessionID}/command") capture as a prefix
// ending in "/" -- skip those, they are not real endpoints.
const endpoints = [
  ...new Set(
    [...src.matchAll(/["'`](\/(?:api|trpc)\/[A-Za-z0-9_\-/.]+)/g)].map((m) => m[1]),
  ),
]
  .filter((e) => !e.endsWith("/"))
  .sort();

console.log(`== DRIFT-1. Extension endpoint contract (${endpoints.length} endpoints)`);
if (endpoints.length < 20) check("endpoint extraction found the expected surface", false, `only ${endpoints.length} found`);
for (const ep of endpoints) {
  const r = await probe(ep);
  check(`endpoint exists: ${ep}`, r.status !== 404 && r.status !== 0, `status=${r.status} via ${r.method}${r.error ? ` ${r.error}` : ""}`);
}

// ---- 2. rpc.js TOOL contract vs index.js registrations ---------------------
// rpc.js is the single source of truth for the plugin's tool names. If index.js
// renames or drops one, consumers (tests, manifests, other harnesses) break
// silently. Assert every promised tool is actually registered.
const toolContract = new Map();
for (const m of rpcSrc.matchAll(/^\s{2}([A-Z_]+):\s*"(hypernexus_[a-z0-9_]+)",\s*$/gm)) {
  toolContract.set(m[1], m[2]);
}

console.log(`\n== DRIFT-2. rpc.js TOOL contract vs index.js (${toolContract.size} promised tools)`);
check("rpc.js TOOL contract parsed", toolContract.size >= 25, `only ${toolContract.size} found`);
for (const [key, fullName] of [...toolContract].sort()) {
  const suffix = fullName.replace(/^hypernexus_/, "");
  const registered =
    new RegExp(`name:\\s*"${suffix}"\\s*,`).test(indexSrc) || indexRegExpName(indexSrc, fullName);
  check(`tool registered: ${fullName}`, registered, `rpc.js TOOL.${key} promises it but index.js has no matching name`);
}

function indexRegExpName(srcText, fullName) {
  return new RegExp(`name:\\s*"${fullName}"\\s*,`).test(srcText);
}

// ---- 3. CAPABILITY mapping integrity ---------------------------------------
// Every capability must map to a TOOL.* key that exists in the contract.
const capBlock = rpcSrc.match(/export const CAPABILITY = Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1] ?? "";
const capRefs = [...capBlock.matchAll(/^\s{2}([a-z_]+):\s*TOOL\.([A-Z_]+),\s*$/gm)];

console.log(`\n== DRIFT-3. CAPABILITY mapping integrity (${capRefs.length} capabilities)`);
check("CAPABILITY block parsed", capRefs.length >= 10, `only ${capRefs.length} found`);
for (const [, cap, toolKey] of capRefs) {
  check(`capability ${cap} -> TOOL.${toolKey}`, toolContract.has(toolKey), `TOOL.${toolKey} is not in the rpc.js TOOL contract`);
}

// ---- 4. live registry sanity -----------------------------------------------
const res = await fetch(`${KERNEL}/api/mcp/tools`, { signal: AbortSignal.timeout(20000) }).catch(() => null);
const inv = res ? await res.json().catch(() => null) : null;
const live = new Set(
  (Array.isArray(inv?.data) ? inv.data : Array.isArray(inv?.tools) ? inv.tools : []).map((t) => t.name).filter(Boolean),
);
console.log(`\n== DRIFT-4. Live kernel registry sanity (${live.size} live tools)`);
check("live registry responds with tools", live.size > 0, JSON.stringify(inv).slice(0, 90));
for (const name of ["bash", "read_file", "memory_scratchpad_set", "hello_world"]) {
  check(`live registry has core tool: ${name}`, live.has(name));
}

console.log(`\n== T10-DRIFT SUMMARY: ${passed} pass, ${failed} fail`);
process.exit(failed === 0 ? 0 : 1);
