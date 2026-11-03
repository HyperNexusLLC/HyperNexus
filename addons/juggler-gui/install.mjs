#!/usr/bin/env node
/**
 * install.mjs -- HyperNexus -> Juggler integration installer.
 * Installs the HyperNexus MCP server config (mcp.json), model connection
 * (connection.json) and Meta model doc for the Juggler harness.
 * Idempotent; byte-compares before writing.
 *
 * Modes:
 *   node addons/juggler-gui/install.mjs               install into <repo>/.juggler-gui/
 *   node addons/juggler-gui/install.mjs --global      install into ~/.juggler-gui/
 *   node addons/juggler-gui/install.mjs --check       verify installation (exit 1 on gaps)
 *   node addons/juggler-gui/install.mjs --uninstall   remove managed files
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const HOME = process.env.USERPROFILE || process.env.HOME || "";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const GLOBAL = process.argv.includes("--global");
const SRC = path.join(REPO_ROOT, "addons", "juggler-gui");
const TARGET = GLOBAL ? path.join(HOME, ".juggler-gui") : path.join(REPO_ROOT, ".juggler-gui");
const FILES = ["mcp.json", "connection.json", "meta-model.juggler-gui.md"];
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function readOk(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }
if (MODE === "check") {
  let gaps = [];
  for (const f of FILES) {
    const a = readOk(path.join(SRC, f));
    const b = readOk(path.join(TARGET, f));
    if (a === null) gaps.push("missing source " + f);
    else if (a !== b) gaps.push("drift/missing " + f);
  }
  if (gaps.length) { console.error("[" + "juggler-gui" + "] gaps:\n" + gaps.map((x) => " - " + x).join("\n")); process.exit(1); }
  console.log("[" + "juggler-gui" + "] install OK (" + TARGET + ")");
} else if (MODE === "uninstall") {
  for (const f of FILES) { try { fs.unlinkSync(path.join(TARGET, f)); } catch {} }
  console.log("[" + "juggler-gui" + "] uninstalled from " + TARGET);
} else {
  ensureDir(TARGET);
  for (const f of FILES) {
    const a = readOk(path.join(SRC, f));
    if (a === null) { console.error("missing source " + f); process.exit(1); }
    const dest = path.join(TARGET, f);
    if (readOk(dest) !== a) { fs.writeFileSync(dest, a); console.log("wrote " + dest); }
  }
  console.log("[" + "juggler-gui" + "] installed to " + TARGET + ". Mint: node addons/juggler-gui/bin/meta-muse-key.mjs --check");
}
