#!/usr/bin/env node
// HyperNexus addon: maki — routes through the HN kernel (providers.toml [meta], key via META_MUSE_API_KEY env).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
const HOME = os.homedir() || process.env.USERPROFILE || "";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-maki]";
const log = (m) => console.log(`${TAG} ${m}`);
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, "utf8"); };
const appdata = process.env.APPDATA || path.join(HOME, "AppData", "Roaming");
const MAKI_HOME = path.join(appdata, "maki");
// NOTE: providers.toml is maki-owned (it zeroes/migrates the file itself;
// live config is in its internal store). This installer never writes it.
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ""));
const ROOT = path.resolve(HERE, "..", "..");
const EXT = path.join(ROOT, "extensions", "maki-hypernexus");
const SYNC_FILES = ["init.lua", "plugin.toml", "mcp.toml"];
const SYNC_DIRS = ["lua", "commands", "skills"];
function syncTree(dst) {
  // Copy the extension tree (README.md copy recipe) into dst (global home
  // or project .maki scope). Returns list of copied rel paths.
  const done = [];
  for (const f of SYNC_FILES) {
    const src = path.join(EXT, f);
    if (!fs.existsSync(src)) continue;
    write(path.join(dst, f), fs.readFileSync(src, "utf8"));
    done.push(f);
  }
  for (const d of SYNC_DIRS) {
    const srcDir = path.join(EXT, d);
    if (!fs.existsSync(srcDir)) continue;
    const dstDir = path.join(dst, d);
    fs.mkdirSync(dstDir, { recursive: true });
    for (const e of fs.readdirSync(srcDir, { withFileTypes: true })) {
      const s = path.join(srcDir, e.name), t = path.join(dstDir, e.name);
      if (e.isDirectory()) { fs.cpSync(s, t, { recursive: true }); done.push(`${d}/${e.name}/`); }
      else { write(t, fs.readFileSync(s, "utf8")); done.push(`${d}/${e.name}`); }
    }
  }
  return done;
}
function install() {
  // Sync the extension tree to the global maki home AND the project .maki
  // scope (battery sections 2+3 verify both). providers.toml is untouched
  // by design — maki manages it in its live store.
  const global = syncTree(MAKI_HOME);
  log(`synced ${global.length} entries -> ${MAKI_HOME}`);
  const project = syncTree(path.join(ROOT, ".maki"));
  log(`synced ${project.length} entries -> ${path.join(ROOT, ".maki")} (needs /trust once in maki)`);
  return true;
}
function check() {
  const gaps = [];
  // Installed-copy sync (mirrors battery section 2): global + project trees
  // must match the extension source. providers.toml is vestigial (maki
  // migrated live config into its own store; a 0-byte file is normal).
  for (const [label, base] of [["global", MAKI_HOME], ["project", path.join(ROOT, ".maki")]]) {
    for (const f of [...SYNC_FILES, "lua/hypernexus.lua", "lua/meta_oauth.lua"]) {
      const a = path.join(EXT, f), b = path.join(base, f);
      if (!fs.existsSync(b)) { gaps.push(`${label} copy missing: ${f} (run: node addons/maki/install.mjs)`); continue; }
      if (read(a) !== read(b)) gaps.push(`${label} copy drifted: ${f} (run: node addons/maki/install.mjs)`);
    }
    for (const d of ["skills", "commands"]) {
      if (!fs.existsSync(path.join(base, d))) gaps.push(`${label} copy missing: ${d}/ (run: node addons/maki/install.mjs)`);
    }
  }
  // Source of truth for auth: maki's own model list from its live store.
  try {
    // Note: 'maki auth status' also lists an OAuth 'Meta (Muse subscription)' variant that shows
    // unauthenticated even when the working API-key path is live (verified MAKI-META-OK/MAKI2).
    // Truth test = model catalog, which maki serves from its live store.
    const models = execFileSync("maki", ["models"], { cwd: os.tmpdir(), encoding: "utf8", timeout: 180000 });
    if (!/muse-(spark-1\.3|wonder-1\.0)-contributor/.test(models)) gaps.push("maki models: no spark|wonder contributor");
  } catch (e) { gaps.push(`maki CLI not runnable (${(e.message || "").split("\n")[0]})`); }
  if (gaps.length) { console.log(`${TAG} CHECK FAILED:\n  - ${gaps.join("\n  - ")}`); process.exit(1); }
  console.log(`${TAG} CHECK OK: meta authenticated + muse-spark listed (live store).`);
}
if (MODE === "check") check();
else if (MODE === "uninstall") log("uninstall: providers.toml left in place by design.");
else install();
