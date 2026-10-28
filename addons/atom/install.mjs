#!/usr/bin/env node
// HyperNexus addon: atom (AtomCode CLI) — openai-compatible meta provider + HN MCP + skills.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
const HOME = os.homedir() || process.env.USERPROFILE || "";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-atom]";
const log = (m) => console.log(`${TAG} ${m}`);
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, "utf8"); };
const CFG = path.join(HOME, ".atomcode", "config.toml");
const MCP = path.join(HOME, ".atomcode", "mcp.json");
const SKILLS = path.join(HOME, ".atomcode", "skills");
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const HN_SKILLS = ["hypernexus-memory", "hypernexus-ops", "hypernexus-tools", "hypernexus-workflows"];
function exe() { return "C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe"; }
function install() {
  if (!read(CFG)) {
    write(CFG, `default_provider = "meta"\ndefault_model = "muse-spark-1.3-contributor"\n\n[providers.meta]\ntype = "openai-compatible"\nmodel = "muse-spark-1.3-contributor"\napi_key = "\${META_MUSE_API_KEY}"\nbase_url = "https://api.meta.ai/v1"\n`);
    log(`meta provider written to ${CFG}.`);
  } else log(`${CFG} exists, left in place.`);
  let mcp = {};
  const raw = read(MCP);
  if (raw) { try { mcp = JSON.parse(raw); } catch { log(`WARNING: cannot parse ${MCP}.`); } }
  mcp.mcpServers = mcp.mcpServers || {};
  mcp.mcpServers.hypernexus = { command: exe(), args: ["mcp"] };
  write(MCP, JSON.stringify(mcp, null, 2) + "\n");
  let n = 0;
  for (const s of HN_SKILLS) {
    const src = path.join(REPO, "plugins", "hypernexus", "skills", s, "SKILL.md");
    if (fs.existsSync(src)) { write(path.join(SKILLS, s, "SKILL.md"), fs.readFileSync(src, "utf8")); n++; }
  }
  log(`HN MCP + ${n} skills installed (key via META_MUSE_API_KEY; direct binary ~/bin/freebuff-style: atomcode on PATH or full path).`);
  return true;
}
function check() {
  const gaps = [];
  if (!read(CFG)) gaps.push(`missing ${CFG}`);
  const raw = read(MCP);
  if (!raw) gaps.push(`missing ${MCP}`);
  else { try { if (!JSON.parse(raw)?.mcpServers?.hypernexus) gaps.push("no mcpServers.hypernexus"); } catch { gaps.push("mcp.json invalid"); } }
  for (const s of HN_SKILLS) if (!fs.existsSync(path.join(SKILLS, s, "SKILL.md"))) gaps.push(`missing skill ${s}`);
  if (gaps.length) { console.log(`${TAG} CHECK FAILED:\n  - ${gaps.join("\n  - ")}`); process.exit(1); }
  console.log(`${TAG} CHECK OK: config + MCP + ${HN_SKILLS.length} skills.`);
}
if (MODE === "check") check();
else if (MODE === "uninstall") log("uninstall: config left in place by design.");
else install();
