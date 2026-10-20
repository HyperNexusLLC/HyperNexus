#!/usr/bin/env node
/**
 * test-opencode-e2e.mjs — REAL end-to-end through the OpenCode service
 * =====================================================================
 * Drives the actual OpenCode HTTP API (no mock ctx, no model needed):
 *   1. plugin load-state via GET /api/plugin
 *   2. creates a real session
 *   3. executes report-kind /hn-* commands through POST /api/session/{id}/command
 *   4. asserts the commands' synthetic output persisted in the session
 *   5. asserts /hn-store reached the HyperNexus kernel
 *   6. cleans the session up
 *
 * Run: node bin/test-opencode-e2e.mjs
 */

import { execFileSync } from "node:child_process";

const KERNEL = "http://127.0.0.1:7778";
const ROOT = "C:\\Users\\hyper\\workspace\\HyperNexus";
let passed = 0;
let failed = 0;

function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function api(args, opts = {}) {
  try {
    // opencode is an npm shim (opencode.ps1/cmd) — route through cmd.exe so Node can spawn it.
    const out = execFileSync("cmd.exe", ["/c", "opencode", "api", ...args], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: 60000,
      windowsVerbatimArguments: false,
      ...opts,
    });
    try {
      return JSON.parse(out);
    } catch {
      return out;
    }
  } catch (err) {
    return { __error: String(err?.message || err).slice(0, 300) };
  }
}

console.log("== E2E-1. Plugin load-state (GET /api/plugin)");
const plugins = api(["get", `/api/plugin?location%5Bdirectory%5D=${encodeURIComponent(ROOT)}`]);
const list = Array.isArray(plugins) ? plugins : Array.isArray(plugins?.data) ? plugins.data : [];
const names = list.map((p) => String(p?.id ?? p?.name ?? ""));
check("GET /api/plugin responds", !plugins?.__error, plugins?.__error || "");
check("hypernexus plugin is loaded", names.some((n) => /hypernexus/.test(n)), names.join(","));
const hn = list.find((p) => /hypernexus/.test(String(p?.id ?? p?.name ?? "")));
if (hn) {
  console.log(`        plugin entry: ${JSON.stringify(hn).slice(0, 160)}`);
}

console.log("== E2E-2. Session + report commands (no model involved)");
const created = api(["post", "/api/session", "--data", JSON.stringify({ title: "e2e-hypernexus", location: { directory: ROOT } })]);
const sessionID = created?.id ?? created?.data?.id ?? "";
check("session created", /^[A-Za-z0-9_]+$/.test(sessionID), JSON.stringify(created).slice(0, 120));

if (sessionID) {
  const cmds = [
    ["hn-status", ""],
    ["hn-store", `e2e command probe ${Date.now()} [tags: e2e,command-test]`],
    ["hn-plan", "e2e plan: verify command pipeline"],
    ["hn-restore", ""],
  ];
  for (const [name, text] of cmds) {
    const res = api([
      "post",
      `/api/session/${sessionID}/command`,
      "--data",
      JSON.stringify({ name, text }),
    ]);
    check(`command ${name} accepted`, !res?.__error, res?.__error || JSON.stringify(res).slice(0, 100));
    await new Promise((r) => setTimeout(r, 600)); // let synthetic messages persist
  }

  // Synthetic messages persist asynchronously — poll briefly instead of a single fetch.
  let all = "";
  for (let i = 0; i < 12 && !/Stored to L2 memory/i.test(all); i++) {
    await new Promise((r) => setTimeout(r, 500));
    const messages = api(["get", `/api/session/${sessionID}/message`]);
    const msgs = Array.isArray(messages) ? messages : Array.isArray(messages?.data) ? messages.data : [];
    all = JSON.stringify(msgs);
  }
  check("session contains synthetic output", /HyperNexus|Stored to L2|Plan stored|handoff/i.test(all), all.slice(0, 160));
  check("hn-status report persisted", /HyperNexus status|kernel/i.test(all));
  check("hn-store confirmation persisted", /Stored to L2 memory/i.test(all));

  console.log("== E2E-3. Command → kernel persistence");
  const search = await fetch(`${KERNEL}/api/memory/search?query=e2e%20command%20probe&limit=5`)
    .then((r) => r.json())
    .catch(() => null);
  const rows = Array.isArray(search?.data) ? search.data : [];
  check(
    "hn-store fact reached the HyperNexus kernel",
    rows.some((r) => /e2e command probe/.test(JSON.stringify(r))),
    JSON.stringify(search).slice(0, 120)
  );

  api(["delete", `/api/session/${sessionID}`]);
  console.log("        session cleaned up");
} else {
  check("command hn-status accepted", false, "no session");
  check("command hn-store accepted", false, "no session");
  check("command hn-plan accepted", false, "no session");
  check("command hn-restore accepted", false, "no session");
  check("session contains synthetic output", false, "no session");
  check("hn-status report persisted", false, "no session");
  check("hn-store confirmation persisted", false, "no session");
  check("hn-store fact reached the HyperNexus kernel", false, "no session");
}

console.log(`\n== E2E SUMMARY: ${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
