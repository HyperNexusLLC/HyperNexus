// Syntax gate: parse-check every harness extension/plugin so a stray character
// (like the '=  // comment' that broke the pi extension on 2026-10-24) fails the
// gauntlet BEFORE it reaches pi / the harness. Run: node bin/test-syntax.mjs
//   - pi extension (.ts)  -> esbuild (pi uses a TS parse; esbuild catches the same)
//   - mimo / opencode (.js) -> node --check
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";

const root = process.cwd();
const esbuild = join(root, "node_modules", ".bin", process.platform === "win32" ? "esbuild.cmd" : "esbuild");

let pass = 0, fail = 0;
const fails = [];

function checkTs(label, file) {
  if (!existsSync(file)) { fails.push(`MISSING ${label}: ${file}`); fail++; return; }
  const r = spawnSync(esbuild, [file, "--outfile=" + join(root, "bin", "_syntax_check.js")], { encoding: "utf8", shell: true });
  if (r.status === 0) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; fails.push(`FAIL ${label}: ${(r.stderr || r.stdout || "").split("\n").slice(0, 3).join(" ")}`); console.log(`  FAIL ${label}`); }
}

function checkJs(label, file) {
  if (!existsSync(file)) { fails.push(`MISSING ${label}: ${file}`); fail++; return; }
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (r.status === 0) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; fails.push(`FAIL ${label}: ${(r.stderr || r.stdout || "").split("\n").slice(0, 3).join(" ")}`); console.log(`  FAIL ${label}`); }
}

console.log("== T11-SYNTAX: extension + plugin parse gate ==");
// pi extension: check BOTH the git source and the active install copy (the
// active one is what pi actually loads — the 2026-10-24 breakage was there).
checkTs("pi ext (addons)", join(root, "addons", "pi", "hypernexus.ts"));
checkTs("pi ext (active ~/.pi)", join(process.env.HOME || process.env.USERPROFILE || "", ".pi", "agent", "extensions", "hypernexus.ts"));
checkJs("mimo plugin", join(root, "addons", "mimo", "plugin", "hypernexus", "index.js"));
checkJs("mimo tui", join(root, "addons", "mimo", "plugin", "hypernexus-tui", "tui.js"));
checkJs("opencode plugin", join(root, "addons", "opencode", "plugin", "hypernexus", "index.js"));

console.log(`\n== T11-SYNTAX SUMMARY: ${pass} pass, ${fail} fail ==`);
for (const f of fails) console.log("  " + f);
process.exit(fail ? 1 : 0);
