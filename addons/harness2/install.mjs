#!/usr/bin/env node
// HyperNexus addon: harness2 (google-research/harness2) — model env wiring.
// Model names persist via setx; the judge key is MINTED LIVE per shell from pi
// OAuth (pi owns refresh) and never stored — see bin/meta-muse-key.mjs.
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-harness2]";
const log = (m) => console.log(`${TAG} ${m}`);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VARS = {
  HARNESS2_SOLVER_MODEL: "meta/muse-spark-1.3-contributor",
  HARNESS2_IMPROVER_MODEL: "meta/muse-spark-1.3-contributor",
  HARNESS2_CODEX_MODEL: "muse-spark-1.3-contributor",
  HARNESS2_JUDGE_MODEL: "meta/muse-spark-1.3-contributor",
  HARNESS2_JUDGE_BASE_URL: "http://127.0.0.1:7778/v1",
};
function setx(k, v) {
  try { execFileSync("setx", [k, v], { stdio: "ignore" }); } catch { /* non-Windows or setx missing: process env only */ }
  process.env[k] = v;
}
// Mint a Model API key LIVE via the canonical shared minter (pi owns refresh).
// Returns null when no pi login is present — never throws, never stores.
function mintLive() {
  try {
    const out = execFileSync(process.execPath, [path.join(HERE, "bin", "meta-muse-key.mjs")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 45000 }).trim();
    return out || null;
  } catch { return null; }
}
function install() {
  for (const [k, v] of Object.entries(VARS)) setx(k, v);
  // NOTE: ~/.pi/agent/auth.json .meta.access is a SHORT-LIVED token (minutes)
  // and must not be copied into env. Mint a Model API key live instead.
  const key = mintLive();
  if (key) {
    process.env.META_API_KEY = key;
    process.env.HARNESS2_JUDGE_API_KEY = key;
    log("solver/improver/codex/judge model env ensured (meta/muse-spark-1.3-contributor) + judge key minted live for this shell (value hidden).");
  } else {
    log("WARNING: live mint unavailable (run /login meta in pi); HARNESS2_JUDGE_API_KEY left as-is. Re-run after login or set META_API_KEY in your shell.");
  }
  log("persist the key across shells with: $env:META_API_KEY = \"$(node addons/harness2/bin/meta-muse-key.mjs)\" (per shell, never setx).");
  return true;
}
function check() {
  const gaps = [];
  for (const [k, v] of Object.entries(VARS)) if (process.env[k] !== v) gaps.push(`${k} (re-open shell after install; setx is persistent)`);
  if (!process.env.HARNESS2_JUDGE_API_KEY && !process.env.META_API_KEY) gaps.push("HARNESS2_JUDGE_API_KEY/META_API_KEY (mint: node addons/harness2/bin/meta-muse-key.mjs --check)");
  if (gaps.length) { console.log(`${TAG} CHECK NOTE:\n  - ${gaps.join("\n  - ")}`); return; }
  console.log(`${TAG} CHECK OK: model env + judge key present.`);
}
if (MODE === "check") check();
else if (MODE === "uninstall") log("uninstall: env left in place by design.");
else install();
