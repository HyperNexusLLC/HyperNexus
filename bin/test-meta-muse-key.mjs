// Generic minter gate: one canonical meta-muse-key.mjs in addons/shared/bin,
// thin per-harness shims, offline reauth-vs-network diagnosis.
// Run: node bin/test-meta-muse-key.mjs (no network use; fixtures in os.tmpdir).
import { spawnSync } from "child_process";
import { existsSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const root = process.cwd();
const shared = join(root, "addons", "shared", "bin", "meta-muse-key.mjs");
const harnesses = ["claude-code", "codex", "crush", "droid", "freebuff",
  "jcode", "mini-swe-agent", "muse-code", "open-interpreter", "opencode"];

let pass = 0, fail = 0;
const fails = [];
function ok(label, cond, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; fails.push(`FAIL ${label}${detail ? ": " + detail : ""}`); console.log(`  FAIL ${label}`); }
}
function run(file, args, env = {}) {
  return spawnSync(process.execPath, [file, ...args],
    { encoding: "utf8", env: { ...process.env, ...env } });
}
const noAuthEnv = { META_AUTH_PATH: join(tmpdir(), "hn-no-such-auth-dir", "auth.json") };

console.log("== META-MUSE-KEY: generic minter gate ==");
// 1. canonical exists + parses
ok("shared canonical exists", existsSync(shared));
if (existsSync(shared)) {
  const c = run(shared, ["--help"]);
  ok("shared --help exits 0 offline", c.status === 0, `status=${c.status}`);
}
// 2. every harness shim exists, parses, delegates (no forked mint logic)
import { readFileSync } from "fs";
for (const h of harnesses) {
  const f = join(root, "addons", h, "bin", "meta-muse-key.mjs");
  ok(`${h} shim exists`, existsSync(f));
  if (!existsSync(f)) continue;
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  ok(`${h} shim parses`, r.status === 0, (r.stderr || "").split("\n")[0]);
  const src = readFileSync(f, "utf8");
  ok(`${h} shim delegates to shared`, src.includes("shared/bin/meta-muse-key.mjs"), "no shared import");
  ok(`${h} shim carries no forked mint`, !src.includes("api_key") && !src.includes("fetch("), "contains mint logic");
}
// 3. offline reauth diagnosis (missing / corrupt auth, no network)
if (existsSync(shared)) {
  const missing = run(shared, ["--doctor"], noAuthEnv);
  ok("doctor: missing auth -> exit 2 (reauth)", missing.status === 2, `status=${missing.status}`);
  ok("doctor: missing auth names /login meta",
    (missing.stderr || "").includes("/login meta"), (missing.stderr || "").split("\n")[0] || "(silent)");

  const dir = mkdtempSync(join(tmpdir(), "hn-auth-"));
  const bad = join(dir, "auth.json");
  writeFileSync(bad, "{not json");
  const corrupt = run(shared, ["--doctor"], { META_AUTH_PATH: bad });
  ok("doctor: corrupt auth -> exit 2 (reauth)", corrupt.status === 2, `status=${corrupt.status}`);

  const goodShape = join(dir, "auth2.json");
  writeFileSync(goodShape, JSON.stringify({ meta: { type: "oauth", refresh: "fixture" } }));
  const deadMint = "http://127.0.0.1:9/nope";
  const net = run(shared, ["--doctor"],
    { META_AUTH_PATH: goodShape, META_KEY_MINT_URL: deadMint });
  ok("doctor: unreachable mint -> exit 1 (network, not reauth)", net.status === 1, `status=${net.status}`);
  ok("doctor: network error does not blame session",
    !(net.stderr || "").includes("expired"), (net.stderr || "").split("\n")[0] || "(silent)");

  // 4. per-harness reauth hint preserved (jcode native login), still offline
  const jcode = run(join(root, "addons", "jcode", "bin", "meta-muse-key.mjs"),
    ["--doctor"], noAuthEnv);
  ok("jcode shim keeps native-login hint",
    (jcode.stderr || "").includes("jcode login"), (jcode.stderr || "").split("\n")[0] || "(silent)");
}

console.log(`\n== META-MUSE-KEY SUMMARY: ${pass} pass, ${fail} fail ==`);
for (const f of fails) console.log("  " + f);
process.exit(fail ? 1 : 0);
