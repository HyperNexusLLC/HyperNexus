#!/usr/bin/env node
// HyperNexus addon: agy — hypernexus MCP server registration (models need interactive agy sign-in).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-agy]";
const log = (m) => console.log(`${TAG} ${m}`);
const HOME = process.env.USERPROFILE || process.env.HOME || "";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
function findKernel() {
  const configured = process.env.HYPERNEXUS_BIN;
  if (configured && fs.existsSync(configured)) return configured;
  const exe = process.platform === "win32" ? "hypernexus.exe" : "hypernexus";
  for (const c of [path.join(REPO, "bin", exe), path.join(HOME, ".hypernexus", "bin", exe)]) {
    if (fs.existsSync(c)) return c;
  }
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    const c = path.join(dir, exe);
    if (c && fs.existsSync(c)) return c;
  }
  return path.join(REPO, "bin", exe);
}
function wsRoot() { return process.env.HYPERNEXUS_WORKSPACE_ROOT || REPO; }
function agy(args) { return execFileSync("agy", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
function install() {
  try {
    const out = agy(["mcp", "list"]);
    if (!/hypernexus/.test(out)) {
      agy(["mcp", "add", "-e", `HYPERNEXUS_WORKSPACE_ROOT=${wsRoot()}`, "-e", `HYPERNEXUS_URL=${process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778"}`, "hypernexus", findKernel(), "mcp"]);
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
