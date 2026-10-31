#!/usr/bin/env node
// HyperNexus addon: pi — installs hypernexus.ts + MCP snippet (models are pi-native; pi owns Meta OAuth).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const HOME = os.homedir() || process.env.USERPROFILE || process.env.HOME || "";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-pi]";
const log = (m) => console.log(`${TAG} ${m}`);
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, "utf8"); };
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const SRC_EXT = path.join(HERE, "hypernexus.ts");
const DST_EXT = path.join(HOME, ".pi", "agent", "extensions", "hypernexus.ts");
const MCP_FILE = path.join(HOME, ".pi", "agent", "mcp.json");
const AUTH_FILE = path.join(HOME, ".pi", "agent", "auth.json");
const SETTINGS_FILE = path.join(HOME, ".pi", "agent", "settings.json");
function snippetServer() {
  const raw = read(path.join(HERE, "mcp.pi.json"));
  return JSON.parse(raw).mcpServers.hypernexus;
}
function install() {
  const src = read(SRC_EXT);
  if (!src) { log(`FATAL: missing ${SRC_EXT}`); process.exit(1); }
  const dst = read(DST_EXT);
  if (dst !== null && dst !== src) write(DST_EXT + ".bak", dst);
  write(DST_EXT, src);
  let mcp = {};
  const raw = read(MCP_FILE);
  if (raw) { try { mcp = JSON.parse(raw); } catch { log(`WARNING: cannot parse ${MCP_FILE}; leaving it untouched.`); } }
  mcp.mcpServers = mcp.mcpServers && typeof mcp.mcpServers === "object" ? mcp.mcpServers : {};
  mcp.mcpServers.hypernexus = snippetServer();
  if (raw) write(MCP_FILE, JSON.stringify(mcp, null, 2) + "\n");
  else log(`NOTE: ${MCP_FILE} does not exist; snippet lives in mcp.pi.json (pi creates mcp.json on first MCP use).`);
  log(`extension installed -> ${DST_EXT} (+ MCP snippet merged where possible).`);
  log("Meta model is pi-native: defaultProvider meta / defaultModel muse-spark-1.3-contributor (see meta-model.pi.md).");
  return true;
}
function check() {
  const gaps = [];
  const src = read(SRC_EXT);
  const dst = read(DST_EXT);
  if (!src) gaps.push(`missing source ${SRC_EXT}`);
  if (dst === null) gaps.push(`extension not installed (${DST_EXT})`);
  else if (src !== null && dst !== src) gaps.push("installed extension drifted from source (re-run install)");
  const mraw = read(MCP_FILE);
  if (!mraw) gaps.push(`missing ${MCP_FILE}`);
  else { try { const o = JSON.parse(mraw); if (!o?.mcpServers?.hypernexus) gaps.push("mcp.json: no mcpServers.hypernexus"); } catch { gaps.push("mcp.json invalid"); } }
  const araw = read(AUTH_FILE);
  if (!araw) gaps.push(`missing ${AUTH_FILE}`);
  else { try { const o = JSON.parse(araw); if (!o?.meta?.refresh) gaps.push("auth.json: no meta.refresh (run /login meta in pi)"); } catch { gaps.push("auth.json invalid"); } }
  const sraw = read(SETTINGS_FILE);
  if (!sraw) gaps.push(`missing ${SETTINGS_FILE}`);
  else {
    if (!/"defaultProvider"\s*:\s*"meta"/.test(sraw)) gaps.push('settings.json: defaultProvider is not "meta"');
    if (!/"defaultModel"\s*:\s*"muse-spark-1\.3-contributor"/.test(sraw)) gaps.push('settings.json: defaultModel is not "muse-spark-1.3-contributor"');
  }
  if (gaps.length) { console.log(`${TAG} CHECK FAILED:\n  - ${gaps.join("\n  - ")}`); process.exit(1); }
  console.log(`${TAG} CHECK OK: extension + MCP + meta OAuth + model pin.`);
}
function uninstall() {
  try { fs.rmSync(DST_EXT, { force: true }); } catch {}
  const raw = read(MCP_FILE);
  if (raw) {
    try {
      const o = JSON.parse(raw);
      if (o?.mcpServers?.hypernexus?.command?.includes("hypernexus")) {
        delete o.mcpServers.hypernexus;
        write(MCP_FILE, JSON.stringify(o, null, 2) + "\n");
      }
    } catch {}
  }
  log("uninstalled (extension removed, MCP entry removed).");
}
if (MODE === "check") check();
else if (MODE === "uninstall") uninstall();
else install();
