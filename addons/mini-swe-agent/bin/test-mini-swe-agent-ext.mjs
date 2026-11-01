#!/usr/bin/env node
// test-mini-swe-agent-ext.mjs — mini-swe-agent extension battery wrapper.
// Delegates to the canonical hermetic python battery
// (addons/mini-swe-agent/tests/test_miniswe_ext.py, P1-P7) and adds the
// shared-minter --check gate. Run: node addons/mini-swe-agent/bin/test-mini-swe-agent-ext.mjs
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADDON = path.resolve(__dirname, "..");
const REPO = path.resolve(ADDON, "..", "..");
const py = path.join(ADDON, "tests", "test_miniswe_ext.py");
const shim = path.join(ADDON, "bin", "meta-muse-key.mjs");

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

console.log("== MINI-SWE-AGENT extension battery ==");
check("python battery present", existsSync(py));
if (existsSync(py)) {
  const r = spawnSync("python", [py], { encoding: "utf8", timeout: 120000 });
  const out = (r.stdout || "") + (r.stderr || "");
  for (const line of out.split("\n")) {
    if (line.includes("[PASS]") || line.includes("[FAIL]") || line.includes("[WARN]")) console.log(`  ${line.trim()}`);
  }
  check("python battery exit 0", r.status === 0, `status=${r.status}`);
}
check("minter shim present", existsSync(shim));
if (existsSync(shim)) {
  const c = spawnSync(process.execPath, [shim, "--check"], { encoding: "utf8", timeout: 60000 });
  check("minter --check (live mint; needs pi login)", c.status === 0, `status=${c.status} ${(c.stderr || "").split("\n")[0] || ""}`);
}
console.log(`mini-swe-agent battery: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
