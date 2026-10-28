#!/usr/bin/env node
// HyperNexus addon: agy — hypernexus MCP server registration (models need interactive agy sign-in).
import { execFileSync } from "node:child_process";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-agy]";
const log = (m) => console.log(`${TAG} ${m}`);
const EXE = "C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe";
function agy(args) { return execFileSync("agy", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
function install() {
  try {
    const out = agy(["mcp", "list"]);
    if (!/hypernexus/.test(out)) {
      agy(["mcp", "add", "-e", "HYPERNEXUS_WORKSPACE_ROOT=C:/Users/hyper/workspace/HyperNexus", "-e", "HYPERNEXUS_URL=http://127.0.0.1:7778", "hypernexus", EXE, "mcp"]);
      log("hypernexus MCP added.");
    } else log("hypernexus MCP already present.");
  } catch (e) { log(`WARNING: agy CLI not runnable (${(e.message || "").split("\n")[0]}); run 'agy mcp add' manually.`); return false; }
  return true;
}
function check() {
  try {
    const out = agy(["mcp", "list"]);
    if (!/hypernexus/.test(out)) { console.log(`${TAG} CHECK FAILED: hypernexus not in 'agy mcp list'.`); process.exit(1); }
  } catch { console.log(`${TAG} CHECK FAILED: agy CLI not runnable.`); process.exit(1); }
  console.log(`${TAG} CHECK OK: hypernexus MCP enabled (models require interactive agy sign-in).`);
}
if (MODE === "check") check();
else if (MODE === "uninstall") { try { agy(["mcp", "remove", "hypernexus"]); log("removed."); } catch { log("WARNING: could not remove; agy CLI not runnable."); } }
else install();
