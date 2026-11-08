#!/usr/bin/env node
/**
 * install.mjs -- HyperNexus -> Codex GUI integration installer.
 * Installs the HyperNexus MCP server config (mcp.json), model connection
 * (connection.json) and Meta model doc for the Codex GUI harness.
 * Idempotent; byte-compares before writing.
 *
 * Modes:
 *   node addons/codex-gui/install.mjs               install into <repo>/.codex-gui/
 *   node addons/codex-gui/install.mjs --global      install into ~/.codex-gui/
 *   node addons/codex-gui/install.mjs --check       verify installation (exit 1 on gaps)
 *   node addons/codex-gui/install.mjs --uninstall   remove managed files
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const HOME = process.env.USERPROFILE || process.env.HOME || "";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const GLOBAL = process.argv.includes("--global");
const SRC = path.join(REPO_ROOT, "addons", "codex-gui");
const TARGET = GLOBAL ? path.join(HOME, ".codex-gui") : path.join(REPO_ROOT, ".codex-gui");
const FILES = ['mcp.json', 'connection.json', 'meta-model.codex-gui.md', 'prompt-overlay.md'];
const DIRS = ['commands', 'skills', 'hooks', 'agent'];
function collectRel(dir, base) { base = base || dir; var out = []; var ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; } for (var k = 0; k < ents.length; k++) { var ent = ents[k]; var full = path.join(dir, ent.name); if (ent.isDirectory()) { out = out.concat(collectRel(full, base)); } else if (/[.](md|mjs|sh)$/.test(ent.name)) { out.push(path.relative(base, full)); } } return out; }
function syncDirs() { var n = 0; for (var i = 0; i < DIRS.length; i++) { var sub = DIRS[i]; var rels = collectRel(path.join(SRC, sub)); for (var j = 0; j < rels.length; j++) { var a = readOk(path.join(SRC, sub, rels[j])); var dest = path.join(TARGET, sub, rels[j]); if (readOk(dest) !== a) { ensureDir(path.dirname(dest)); fs.writeFileSync(dest, a); n++; } } } return n; }
function checkDirs(gaps) { for (var i = 0; i < DIRS.length; i++) { var sub = DIRS[i]; var rels = collectRel(path.join(SRC, sub)); for (var j = 0; j < rels.length; j++) { var a = readOk(path.join(SRC, sub, rels[j])); var b = readOk(path.join(TARGET, sub, rels[j])); if (a === null) { gaps.push('missing source ' + sub + '/' + rels[j]); } else if (a !== b) { gaps.push('drift/missing ' + sub + '/' + rels[j]); } } } }
function uninstallDirs() { var n = 0; for (var i = 0; i < DIRS.length; i++) { var sub = DIRS[i]; var rels = collectRel(path.join(SRC, sub)); for (var j = 0; j < rels.length; j++) { try { fs.unlinkSync(path.join(TARGET, sub, rels[j])); n++; } catch (e) {} } } return n; }
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
  checkDirs(gaps);
  if (gaps.length) { console.error("[" + "codex-gui" + "] gaps:\n" + gaps.map((x) => " - " + x).join("\n")); process.exit(1); }
  console.log("[" + "codex-gui" + "] install OK (" + TARGET + ")");
} else if (MODE === "uninstall") {
  for (const f of FILES) { try { fs.unlinkSync(path.join(TARGET, f)); } catch {} }
  uninstallDirs();
  console.log("[" + "codex-gui" + "] uninstalled from " + TARGET);
} else {
  ensureDir(TARGET);
  syncDirs();
  for (const f of FILES) {
    const a = readOk(path.join(SRC, f));
    if (a === null) { console.error("missing source " + f); process.exit(1); }
    const dest = path.join(TARGET, f);
    if (readOk(dest) !== a) { fs.writeFileSync(dest, a); console.log("wrote " + dest); }
  }
  console.log("[" + "codex-gui" + "] installed to " + TARGET + ". Mint: node addons/codex-gui/bin/meta-muse-key.mjs --check");
}
