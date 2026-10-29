#!/usr/bin/env node
// HyperNexus addon: mini-swe-agent — Meta endpoint + muse-spark model via global .env (dotenv-loaded).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const HOME = os.homedir() || process.env.USERPROFILE || "";
const MODE = process.argv.includes("--uninstall") ? "uninstall" : process.argv.includes("--check") ? "check" : "install";
const TAG = "[hypernexus-mini-swe-agent]";
const log = (m) => console.log(`${TAG} ${m}`);
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, "utf8"); };
const appdata = process.env.LOCALAPPDATA || path.join(HOME, "AppData", "Local");
const ENVF = path.join(appdata, "mini-swe-agent", "mini-swe-agent", ".env");
function piMetaToken() { try { return JSON.parse(read(path.join(HOME, ".pi", "agent", "auth.json")) ?? "").meta.access; } catch { return null; } }
function setLine(s, k, v) {
  const re = new RegExp(`^${k}=.*$`, "m");
  return re.test(s) ? s.replace(re, `${k}=${v}`) : (s.endsWith("\n") || s === "" ? s : s + "\n") + `${k}=${v}\n`;
}
function install() {
  let s = read(ENVF) ?? "# mini-swe-agent global config\n";
  s = setLine(s, "MSWEA_MODEL_NAME", "openai/muse-spark-1.3-contributor");
  s = setLine(s, "OPENAI_API_BASE", "http://127.0.0.1:7778/v1");
  const tok = piMetaToken();
  if (tok) s = setLine(s, "OPENAI_API_KEY", tok);
  else log("WARNING: no pi meta token found; key left as-is (run again after pi login).");
  write(ENVF, s);
  log(`meta endpoint + model ensured in ${ENVF} (headless bypass: scripts/mini-swe-agent-meta-test.py).`);
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
