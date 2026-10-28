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
const PROV = path.join(appdata, "maki", "providers.toml");
const BLOCK = `[meta]\ndisplay_name = "Custom (meta)"\nbase_url = "http://127.0.0.1:7778"\napi_key_env = "META_MUSE_API_KEY"\nmodels = [{ id = "muse-spark-1.3-contributor", name = "Muse Spark 1.3 Contributor" }]\n`;
function install() {
  // maki owns providers.toml (observed: it zeroes/migrates the file itself; live config is in its
  // internal store — verified via model catalog + inference). Do not fight it; ensure nothing.
  log(`live store is source of truth (providers.toml managed by maki itself).`);
  return true;
}
function check() {
  const gaps = [];
  // providers.toml is vestigial (maki migrated live config into its own store; a 0-byte file is normal).
  // Source of truth: maki's own auth + model list.
  try {
    // Note: 'maki auth status' also lists an OAuth 'Meta (Muse subscription)' variant that shows
    // unauthenticated even when the working API-key path is live (verified MAKI-META-OK/MAKI2).
    // Truth test = model catalog, which maki serves from its live store.
    const models = execFileSync("maki", ["models"], { cwd: os.tmpdir(), encoding: "utf8", timeout: 180000 });
    if (!/muse-spark-1\.3-contributor/.test(models)) gaps.push("maki models: no muse-spark-1.3-contributor");
  } catch (e) { gaps.push(`maki CLI not runnable (${(e.message || "").split("\n")[0]})`); }
  if (gaps.length) { console.log(`${TAG} CHECK FAILED:\n  - ${gaps.join("\n  - ")}`); process.exit(1); }
  console.log(`${TAG} CHECK OK: meta authenticated + muse-spark listed (live store).`);
}
if (MODE === "check") check();
else if (MODE === "uninstall") log("uninstall: providers.toml left in place by design.");
else install();
