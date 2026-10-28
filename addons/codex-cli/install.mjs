#!/usr/bin/env node
// HyperNexus addon: codex-cli — native meta/muse-spark-1.3-contributor + hypernexus MCP.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const HOME = os.homedir() || process.env.USERPROFILE || "";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-codex-cli]";
const log = (m) => console.log(`${TAG} ${m}`);
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, "utf8"); };
const CFG = path.join(HOME, ".codex", "config.toml");
function exe() { return "C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe"; }
function ensureToml(t) {
  let s = t ?? "";
  const need = (re, block) => { if (!re.test(s)) s += (s.endsWith("\n") || s === "" ? "" : "\n") + block; };
  if (!/^model\s*=/m.test(s)) s = `model = "muse-spark-1.3-contributor"\n` + s;
  else s = s.replace(/^model\s*=.*$/m, `model = "muse-spark-1.3-contributor"`);
  if (!/^model_provider\s*=/m.test(s)) s = s.replace(/^model\s*=.*$/m, (m) => `${m}\nmodel_provider = "meta"`);
  else s = s.replace(/^model_provider\s*=.*$/m, `model_provider = "meta"`);
  need(/\[model_providers\.meta\]/, `\n[model_providers.meta]\nname = "Meta Model API"\nbase_url = "https://api.meta.ai/v1"\nenv_key = "MODEL_API_KEY"\nwire_api = "responses"\n`);
  need(/\[mcp_servers\.hypernexus\]/, `\n[mcp_servers.hypernexus]\ncommand = '${exe()}'\nargs = ["mcp"]\n\n[mcp_servers.hypernexus.env]\nHYPERNEXUS_URL = "http://127.0.0.1:7778"\nHYPERNEXUS_WORKSPACE_ROOT = 'C:/Users/hyper/workspace/HyperNexus'\n`);
  return s;
}
function install() { write(CFG, ensureToml(read(CFG))); log(`meta provider + hypernexus MCP ensured in ${CFG} (key via MODEL_API_KEY, synced from pi).`); return true; }
function check() {
  const gaps = [];
  const raw = read(CFG);
  if (!raw) gaps.push(`missing ${CFG}`);
  else {
    if (!/^model\s*=\s*"muse-spark-1\.3-contributor"/m.test(raw)) gaps.push("model is not muse-spark-1.3-contributor");
    if (!/^model_provider\s*=\s*"meta"/m.test(raw)) gaps.push("model_provider is not meta");
    if (!/\[mcp_servers\.hypernexus\]/.test(raw)) gaps.push("no [mcp_servers.hypernexus]");
  }
  if (gaps.length) { console.log(`${TAG} CHECK FAILED:\n  - ${gaps.join("\n  - ")}`); process.exit(1); }
  console.log(`${TAG} CHECK OK: meta model + hypernexus MCP.`);
}
if (MODE === "check") check();
else if (MODE === "uninstall") log("uninstall: config left in place by design.");
else install();
