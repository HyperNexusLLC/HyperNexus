#!/usr/bin/env node
// Migrate OpenAI-compatible harnesses from direct api.meta.ai to the HN kernel
// proxy (http://127.0.0.1:7778/v1) which re-reads pi's OAuth token per request.
// Stale copied tokens (24h rotation) were the 403 class. Backs up each file.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
const HOME = os.homedir();
const K = "http://127.0.0.1:7778/v1";
const results = [];
function rec(h, item, ok, detail = "") { results.push({ h, item, ok, detail }); console.log(`[${ok ? "OK" : "SKIP"}] ${h} :: ${item} ${detail}`); }
function bak(p) {
  if (fs.existsSync(p) && !fs.existsSync(p + ".bak-kernel-proxy")) fs.copyFileSync(p, p + ".bak-kernel-proxy");
}
function sub(p, from, to) {
  if (!fs.existsSync(p)) return false;
  bak(p);
  const t = fs.readFileSync(p, "utf8");
  if (!t.includes(from)) return false;
  fs.writeFileSync(p, t.split(from).join(to), "utf8");
  return true;
}
const appdata = process.env.APPDATA || path.join(HOME, "AppData", "Roaming");
const localapp = process.env.LOCALAPPDATA || path.join(HOME, "AppData", "Local");

// 1. codex-cli
{
  const p = path.join(HOME, ".codex", "config.toml");
  rec("codex-cli", "base_url", sub(p, "https://api.meta.ai/v1", K) ? "-> kernel" : "already/not-found");
}
// 2. mini-swe-agent .env
{
  const p = path.join(localapp, "mini-swe-agent", "mini-swe-agent", ".env");
  rec("mini-swe-agent", "OPENAI_API_BASE", sub(p, "https://api.meta.ai/v1", K) ? "-> kernel" : "already/not-found");
}
// 3. atom config (may not exist yet — create minimal)
{
  const p = path.join(HOME, ".atomcode", "config.toml");
  if (!fs.existsSync(p)) {
    bak(p);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, `default_provider = "meta"\ndefault_model = "muse-spark-1.3-contributor"\n\n[providers.meta]\ntype = "openai-compatible"\nmodel = "muse-spark-1.3-contributor"\napi_key = "dummy"\nbase_url = "${K}"\n`);
    rec("atom", "config", true, "created -> kernel");
  } else rec("atom", "config", sub(p, "https://api.meta.ai/v1", K) ? "-> kernel" : "already kernel/other");
}
// 4. open-interpreter
{
  const p = path.join(HOME, ".openinterpreter", "config.toml");
  rec("open-interpreter", "base_url", sub(p, "https://api.meta.ai/v1", K) ? "-> kernel" : "already/not-found");
}
// 5. opencode
{
  const p = path.join(HOME, ".config", "opencode", "opencode.json");
  rec("opencode", "baseURL", sub(p, "https://api.meta.ai/v1", K) ? "-> kernel" : "already/not-found");
}
// 6. reasonix [[providers]] meta
{
  const p = path.join(appdata, "reasonix", "config.toml");
  if (fs.existsSync(p)) {
    bak(p);
    let t = fs.readFileSync(p, "utf8");
    const re = /(\[\[providers\]\]\s*\nname\s*=\s*"meta"[\s\S]*?base_url\s*=\s*")https:\/\/api\.meta\.ai\/v1(")/;
    if (re.test(t)) { fs.writeFileSync(p, t.replace(re, `$1${K}$2`), "utf8"); rec("reasonix", "meta base_url", true, "-> kernel"); }
    else rec("reasonix", "meta base_url", t.includes(K), "already kernel or not-found");
  } else rec("reasonix", "meta base_url", false, "config missing");
}
// 7. freebuff BYOK
{
  const p = path.join(HOME, ".config", "freebuff", "byok", "connections.json");
  rec("freebuff", "baseUrl", sub(p, "https://api.meta.ai/v1", K) ? "-> kernel" : "already/not-found");
}
// 8. codewhale [providers.meta] add base_url
{
  const p = path.join(HOME, ".codewhale", "config.toml");
  if (fs.existsSync(p)) {
    bak(p);
    let t = fs.readFileSync(p, "utf8");
    if (t.includes(K)) rec("codewhale", "base_url", true, "already kernel");
    else if (/\[providers\.meta\]/.test(t)) {
      t = t.replace("[providers.meta]", `[providers.meta]\nbase_url = "${K}"`);
      fs.writeFileSync(p, t, "utf8");
      rec("codewhale", "base_url", true, "added -> kernel");
    } else rec("codewhale", "base_url", false, "no [providers.meta]");
  } else rec("codewhale", "base_url", false, "config missing");
}
// 9. harness2 judge base
try {
  execFileSync("setx", ["HARNESS2_JUDGE_BASE_URL", K], { stdio: "ignore" });
  process.env.HARNESS2_JUDGE_BASE_URL = K;
  rec("harness2", "JUDGE_BASE_URL", true, "-> kernel");
} catch { rec("harness2", "JUDGE_BASE_URL", false, "setx failed"); }
// 10. jcode: add kernel provider, keep meta-muse direct as fallback
{
  const p = path.join(HOME, ".jcode", "config.toml");
  if (fs.existsSync(p)) {
    bak(p);
    let t = fs.readFileSync(p, "utf8");
    if (t.includes("meta-kernel")) rec("jcode", "meta-kernel provider", true, "already present");
    else {
      t += `\n[providers.meta-kernel]\ntype = "open-ai-compatible"\nbase_url = "${K}"\nauth = "bearer"\napi_key_env = "HN_KERNEL_DUMMY"\ndefault_model = "muse-spark-1.3-contributor"\nrequires_api_key = false\nprovider_routing = false\nmodel_catalog = false\n`;
      fs.writeFileSync(p, t, "utf8");
      try { execFileSync("setx", ["HN_KERNEL_DUMMY", "dummy"], { stdio: "ignore" }); } catch {}
      process.env.HN_KERNEL_DUMMY = "dummy";
      rec("jcode", "meta-kernel provider", true, "added (meta-muse kept as fallback)");
    }
  } else rec("jcode", "meta-kernel provider", false, "config missing");
}
console.log("\nDone. Restart/reopen harnesses to pick up new endpoints.");
