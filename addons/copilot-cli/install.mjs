#!/usr/bin/env node
// HyperNexus addon: copilot-cli — HN MCP + skills (models are GitHub-side; login is an interactive user step).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const HOME = os.homedir() || process.env.USERPROFILE || "";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-copilot-cli]";
const log = (m) => console.log(`${TAG} ${m}`);
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, "utf8"); };
const MCP = path.join(HOME, ".copilot", "mcp-config.json");
const SKILLS = path.join(HOME, ".copilot", "skills");
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const HN_SKILLS = ["hypernexus-memory", "hypernexus-ops", "hypernexus-tools", "hypernexus-workflows"];
function install() {
  let mcp = {};
  const raw = read(MCP);
  if (raw) { try { mcp = JSON.parse(raw); } catch { log(`WARNING: cannot parse ${MCP}.`); } }
  const key = mcp.servers ? "servers" : "mcpServers";
  mcp[key] = mcp[key] || {};
  mcp[key].hypernexus = { command: "C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe", args: ["mcp"], env: { HYPERNEXUS_WORKSPACE_ROOT: "C:/Users/hyper/workspace/HyperNexus", HYPERNEXUS_URL: "http://127.0.0.1:7778" } };
  write(MCP, JSON.stringify(mcp, null, 2) + "\n");
  let n = 0;
  for (const s of HN_SKILLS) {
    const src = path.join(REPO, "plugins", "hypernexus", "skills", s, "SKILL.md");
    if (fs.existsSync(src)) { write(path.join(SKILLS, s, "SKILL.md"), fs.readFileSync(src, "utf8")); n++; }
  }
  log(`HN MCP + ${n} skills installed. Next (interactive): 'copilot login --device-code'.`);
  return true;
}
function check() {
  const gaps = [];
  const raw = read(MCP);
  if (!raw) gaps.push(`missing ${MCP}`);
  else { try { const o = JSON.parse(raw); if (!(o.servers?.hypernexus || o.mcpServers?.hypernexus)) gaps.push("no hypernexus server"); } catch { gaps.push("mcp config invalid"); } }
  for (const s of HN_SKILLS) if (!fs.existsSync(path.join(SKILLS, s, "SKILL.md"))) gaps.push(`missing skill ${s}`);
  if (gaps.length) { console.log(`${TAG} CHECK FAILED:\n  - ${gaps.join("\n  - ")}`); process.exit(1); }
  console.log(`${TAG} CHECK OK: MCP + ${HN_SKILLS.length} skills.`);
}
if (MODE === "check") check();
else if (MODE === "uninstall") log("uninstall: config left in place by design.");
else install();
