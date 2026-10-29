#!/usr/bin/env node
// HyperNexus addon: harness2 (google-research/harness2) — model env wiring (pi token, pi owns refresh).
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-harness2]";
const log = (m) => console.log(`${TAG} ${m}`);
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
function piMetaToken() {
  try { return JSON.parse(fs.readFileSync(`${os.homedir()}/.pi/agent/auth.json`, "utf8")).meta.access; } catch { return null; }
}
function install() {
  for (const [k, v] of Object.entries(VARS)) setx(k, v);
  const tok = piMetaToken();
  if (tok) setx("HARNESS2_JUDGE_API_KEY", tok);
  else log("WARNING: no pi meta token; HARNESS2_JUDGE_API_KEY left as-is.");
  log("solver/improver/codex/judge model env ensured (meta/muse-spark-1.3-contributor).");
  return true;
}
function check() {
  const gaps = [];
  for (const [k, v] of Object.entries(VARS)) if (process.env[k] !== v) gaps.push(`${k} (re-open shell after install; setx is persistent)`);
  if (gaps.length) { console.log(`${TAG} CHECK NOTE:\n  - ${gaps.join("\n  - ")}`); return; }
  console.log(`${TAG} CHECK OK: model env present.`);
}
if (MODE === "check") check();
else if (MODE === "uninstall") log("uninstall: env left in place by design.");
else install();
