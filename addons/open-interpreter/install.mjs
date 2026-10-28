#!/usr/bin/env node
// HyperNexus addon: open-interpreter (codex-family fork) — meta provider + HN MCP.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
const HOME = os.homedir() || process.env.USERPROFILE || "";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-open-interpreter]";
const log = (m) => console.log(`${TAG} ${m}`);
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, "utf8"); };
const CFG = path.join(HOME, ".openinterpreter", "config.toml");
function install() {
  let s = read(CFG) ?? "";
  if (!/model_provider\s*=\s*"meta"/.test(s)) {
    s += `\nmodel = "muse-spark-1.3-contributor"\nmodel_provider = "meta"\nmodel_reasoning_effort = "high"\n\n[model_providers.meta]\nname = "Meta Model API"\nbase_url = "https://api.meta.ai/v1"\nenv_key = "OPENAI_API_KEY"\nwire_api = "responses"\n`;
    write(CFG, s);
  }
  try {
    const list = execFileSync("interpreter", ["mcp", "list"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (!/hypernexus/.test(list)) execFileSync("interpreter", ["mcp", "add", "hypernexus", "--", "C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe", "mcp"], { stdio: "ignore" });
    log("meta provider ensured; hypernexus MCP ensured.");
  } catch { log("WARNING: interpreter CLI not runnable; config written, add MCP via 'interpreter mcp add hypernexus -- <exe> mcp'."); }
  return true;
}
function check() {
  const gaps = [];
  const raw = read(CFG);
  if (!raw) gaps.push(`missing ${CFG}`);
  else if (!/model_provider\s*=\s*"meta"/.test(raw)) gaps.push("model_provider is not meta");
  if (gaps.length) { console.log(`${TAG} CHECK FAILED:\n  - ${gaps.join("\n  - ")}`); process.exit(1); }
  console.log(`${TAG} CHECK OK: meta provider.`);
}
if (MODE === "check") check();
else if (MODE === "uninstall") log("uninstall: config left in place by design.");
else install();
