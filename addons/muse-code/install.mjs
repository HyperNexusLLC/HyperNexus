#!/usr/bin/env node
// HyperNexus addon: muse-code (muse CLI) — native meta/muse-spark-1.3-contributor via pi OAuth (pi owns refresh).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const HOME = os.homedir() || process.env.USERPROFILE || "";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-muse-code]";
const log = (m) => console.log(`${TAG} ${m}`);
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, "utf8"); };
const SETTINGS = path.join(HOME, ".config", "muse", "settings.json");
function want() {
  return {
    schema_version: 1, provider: "meta", model: "muse-spark-1.3-contributor",
    model_reasoning_efforts: { "muse-spark-1.3": "high", "muse-spark-1.3-contributor": "high" },
    contributor_mode_enabled: true, contributor_mode_disclosure_acknowledged: true,
  };
}
function install() {
  const cur = read(SETTINGS);
  let obj = {};
  if (cur) { try { obj = JSON.parse(cur); } catch { log(`WARNING: cannot parse ${SETTINGS}, leaving untouched.`); return false; } }
  Object.assign(obj, want());
  write(SETTINGS, JSON.stringify(obj, null, 2) + "\n");
  log(`provider=meta model=muse-spark-1.3-contributor ensured in ${SETTINGS} (auth stays in pi auth.json; MCP via 'muse mcp login' when needed).`);
  return true;
}
function check() {
  const gaps = [];
  const raw = read(SETTINGS);
  if (!raw) gaps.push(`missing ${SETTINGS}`);
  else { try { const o = JSON.parse(raw); if (o.provider !== "meta") gaps.push("provider is not meta"); if (o.model !== "muse-spark-1.3-contributor") gaps.push("model is not muse-spark-1.3-contributor"); } catch { gaps.push(`${SETTINGS}: invalid JSON`); } }
  if (gaps.length) { console.log(`${TAG} CHECK FAILED:\n  - ${gaps.join("\n  - ")}`); process.exit(1); }
  console.log(`${TAG} CHECK OK: meta/muse-spark-1.3-contributor.`);
}
if (MODE === "check") check();
else if (MODE === "uninstall") log("uninstall: settings left in place by design (delete manually to revert).");
else install();
