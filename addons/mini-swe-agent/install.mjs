#!/usr/bin/env node
// HyperNexus addon: mini-swe-agent — Meta endpoint + muse-spark model via global .env (dotenv-loaded).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = os.homedir() || process.env.USERPROFILE || "";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-mini-swe-agent]";
const log = (m) => console.log(`${TAG} ${m}`);
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, "utf8"); };
const appdata = process.env.LOCALAPPDATA || path.join(HOME, "AppData", "Local");
const ENVF = path.join(appdata, "mini-swe-agent", "mini-swe-agent", ".env");
// Mint a live Model API key via the canonical shared minter (reads pi
// auth.json -> meta.refresh itself; pi owns OAuth refresh). stdout contract:
// key only. Returns null when the pi session is lapsed or minting fails.
const SHARED_MINTER = path.join(__dirname, "..", "shared", "bin", "meta-muse-key.mjs");
function mintLiveKey() {
  try {
    const out = execFileSync(process.execPath, [SHARED_MINTER], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60000,
    }).trim();
    return out ? out.split(/\s+/)[0] : null;
  } catch { return null; }
}
function setLine(s, k, v) {
  const re = new RegExp(`^${k}=.*$`, "m");
  return re.test(s) ? s.replace(re, `${k}=${v}`) : (s.endsWith("\n") || s === "" ? s : s + "\n") + `${k}=${v}\n`;
}
function install() {
  let s = read(ENVF) ?? "# mini-swe-agent global config\n";
  s = setLine(s, "MSWEA_MODEL_NAME", "openai/muse-spark-1.3-contributor");
  s = setLine(s, "OPENAI_API_BASE", "http://127.0.0.1:7778/v1");
  const tok = mintLiveKey();
  if (tok) s = setLine(s, "OPENAI_API_KEY", tok);
  else log("WARNING: live mint failed (pi Meta session lapsed? run /login meta in pi); key left as-is — re-run install after pi re-login.");
  write(ENVF, s);
  log(`meta endpoint + model ensured in ${ENVF} (key minted live via shared minter; snapshots expire ~24h, re-run install to refresh).`);
  return true;
}
function check() {
  const gaps = [];
  const raw = read(ENVF);
  if (!raw) gaps.push(`missing ${ENVF}`);
  else {
    if (!/^MSWEA_MODEL_NAME=openai\/muse-spark-1\.3-contributor/m.test(raw)) gaps.push("model not set");
    if (!/^OPENAI_API_BASE=(http:\/\/127\.0\.0\.1:7778\/v1|https:\/\/api\.meta\.ai\/v1)/m.test(raw)) gaps.push("base not meta (want kernel http://127.0.0.1:7778/v1 or direct api.meta.ai/v1)");
  }
  if (gaps.length) { console.log(`${TAG} CHECK FAILED:\n  - ${gaps.join("\n  - ")}`); process.exit(1); }
  console.log(`${TAG} CHECK OK: meta endpoint + model.`);
}
if (MODE === "check") check();
else if (MODE === "uninstall") log("uninstall: .env left in place by design.");
else install();
