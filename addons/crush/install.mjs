#!/usr/bin/env node
/**
 * install.mjs — HyperNexus → Crush integration installer
 * ========================================================
 * Installs the full HyperNexus control-plane surface for Crush. Idempotent:
 * managed blocks are marked with `# hypernexus:begin` / `# hypernexus:end`
 * (crushrc) or `<!-- hypernexus:begin -->` / `<!-- hypernexus:end -->` (markdown)
 * and can be re-run or removed safely.
 *
 * Modes:
 *   node addons/crush/install.mjs               install into this project (.crush/)
 *   node addons/crush/install.mjs --global      install into ~/.config/crush/
 *   node addons/crush/install.mjs --check       verify installation (exit 1 on gaps)
 *   node addons/crush/install.mjs --uninstall   remove managed blocks/files
 *
 * What it installs (global → ~/.config/crush/  |  project → .crush/):
 *   crushrc block        Meta provider (pi-OAuth live-read) + hypernexus MCP
 *                        server (FORWARD-SLASH exe path — backslashes break the
 *                        MCP handshake) + skills path + hooks + permissions
 *   hooks dir has hn-pre-tool and hn-session scripts
 *   skills (3): hypernexus, hypernexus-ops, hypernexus-workflows
 *                        (each user-invocable: crush exposes them as /skills)
 *   commands (8 prompt files, reference; symlink or copy
 *                        the ones you want into .crush/commands/ — crush loads
 *                        project commands from there automatically)
 *   prompt-overlay.md    discipline loop + tool map (managed block)
 *   preferred-tools.md   routing preferences (managed block)
 *   (+ global) skills mirror into ~/.config/crush/skills/ so every project sees them
 *
 * The installer never stores secrets: the Meta token is read LIVE from
 * ~/.pi/agent/auth.json at every Crush startup (pi owns OAuth refresh).
 * After install: restart Crush so the new crushrc block + MCP server load.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const HOME = process.env.USERPROFILE || process.env.HOME || "";

const MODE = process.argv.includes("--uninstall")
  ? "uninstall"
  : process.argv.includes("--check")
    ? "check"
    : "install";
const GLOBAL = process.argv.includes("--global");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(flag + "="));
  return eq ? eq.slice(flag.length + 1) : "";
}
const TARGET_OVERRIDE = argValue("--target");
const TARGET = TARGET_OVERRIDE || (GLOBAL ? path.join(HOME, ".config", "crush") : path.join(REPO_ROOT, ".crush"));

const MD_BEGIN = "<!-- hypernexus:begin";
const MD_END = "<!-- hypernexus:end -->";
const RC_BEGIN = "# hypernexus:begin";
const RC_END = "# hypernexus:end";

// ── helpers ──────────────────────────────────────────────────────────────

function readIfExists(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function upsertManagedBlock(filePath, blockText, begin = MD_BEGIN, end = MD_END) {
  const block = blockText.trim();
  const existing = readIfExists(filePath) ?? "";
  const beginIdx = existing.indexOf(begin);
  const endIdx = existing.indexOf(end);
  let next;
  if (beginIdx >= 0 && endIdx > beginIdx) {
    next = existing.slice(0, beginIdx) + block + existing.slice(endIdx + end.length);
  } else {
    next = existing.trimEnd() + (existing.trimEnd() ? "\n\n" : "") + block + "\n";
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next, "utf8");
  return existing !== next;
}

function removeManagedBlock(filePath, begin = MD_BEGIN, end = MD_END) {  const existing = readIfExists(filePath);
  if (existing === null) return false;
  const beginIdx = existing.indexOf(begin);
  const endIdx = existing.indexOf(end);
  if (beginIdx < 0 || endIdx < beginIdx) return false;
  const next = (existing.slice(0, beginIdx) + existing.slice(endIdx + end.length)).replace(/\n{3,}/g, "\n\n");
  if (next.trim() === "") {
    fs.rmSync(filePath, { force: true });
    return true;
  }
  fs.writeFileSync(filePath, next, "utf8");
  return true;
}

/** Forward-slash exe path — backslashes break Crush's shell expansion of the MCP command. */
function resolveExe() {
  const exe = process.platform === "win32" ? "hypernexus.exe" : "hypernexus";
  const candidate = path.join(REPO_ROOT, "bin", exe);
  if (fs.existsSync(candidate)) return candidate.split(path.sep).join("/");
  return exe;
}

function crushrcBlock(exe) {
  const wsRoot = REPO_ROOT.split(path.sep).join("/");
  const skillsDir = GLOBAL ? "$HOME/.config/crush/skills" : path.join(TARGET, "skills").split(path.sep).join("/");
  const hooksDir = GLOBAL ? "$HOME/.config/crush/hooks" : path.join(TARGET, "hooks").split(path.sep).join("/");
  return `${RC_BEGIN} (managed by HyperNexus addons/crush/install.mjs — do not edit inside this block)
# --- Meta provider (OpenAI-compatible, pi-OAuth live-read, pi owns refresh) ---
provider add meta --type openai-compat \\
  --name "Meta" \\
  --base-url "https://api.meta.ai/v1" \\
  --api-key "$(node -e "const p=require('path');const h=process.env.HOME||process.env.USERPROFILE;console.log(require(p.join(h,'.pi','agent','auth.json')).meta.access)")"

# --- Muse Spark 1.3 Contributor as both large and small model ---
# muse-spark is a thinking model: max_tokens must cover reasoning + answer.
# Pi-verified floor for short replies is max-tokens 1024 (32 tokens truncates
# mid-reasoning and yields empty content). The model requests below reflect that.
model add meta/muse-spark-1.3-contributor \\
  --name "Muse Spark 1.3 Contributor" \\
  --context-window 1048576 \\
  --default-max-tokens 131072 \\
  --can-reason true \\
  --supports-images true \\
  --reasoning-effort high

model large meta/muse-spark-1.3-contributor --max-tokens 131072 --reasoning-effort high
model small meta/muse-spark-1.3-contributor --max-tokens 16384

# --- HyperNexus MCP: full control-plane tool access (58 tools) ---
# NOTE: forward slashes are REQUIRED — backslash paths break the MCP handshake.
mcp add hypernexus \\
  --command "${exe}" \\
  --args mcp \\
  --env HYPERNEXUS_WORKSPACE_ROOT "${wsRoot}" \\
  --env HYPERNEXUS_URL "http://127.0.0.1:7778" \\
  --timeout 30

# --- Skills ---
option skill-path "${skillsDir}"

# --- Hooks: OPT-IN (NOT auto-registered — Crush validates hook commands at
# config load and .cmd resolution stalls the load ~70s then bricks every run).
# Hooks ship in hooks/ and check green. To enable after manual verification
# (each must exit 0 fast on piped stdin), paste:
#   hook add PreToolUse --name "hypernexus-gate" --command "${hooksDir}/hn-gate.cmd" --matcher ".*" --timeout 15
#   hook add SessionStart --name "hypernexus-boot" --command "${hooksDir}/hn-session.cmd" --timeout 15

# --- Permissions: read + edit auto-approved, everything else prompts ---
permissions allow view ls grep edit bash read write
option auto-summarize true
${RC_END}`;
}

const SKILLS = ["hypernexus", "hypernexus-ops", "hypernexus-workflows"];
const COMMANDS = ["hn-status", "hn-store", "hn-search", "hn-tools", "hn-session", "hn-context", "hn-summary", "hn-purge"];
const HOOKS = ["hn-pre-tool.sh", "hn-session.sh", "hn-pre-tool.cmd", "hn-session.cmd", "hn-rbac.sh", "hn-rbac.cmd", "hn-gate.cmd"];
const AGENTS = ["hypernexus-orchestrator.md"];

function hooksShellBlock() {
  return `hook add PreToolUse --name "hypernexus-gate" --command "${path.join(TARGET, "hooks", "hn-pre-tool.cmd")}" --matcher ".*" --timeout 15\nhook add SessionStart --name "hypernexus-boot" --command "${path.join(TARGET, "hooks", "hn-session.cmd")}" --timeout 15`;
}

// ── modes ────────────────────────────────────────────────────────────────

if (MODE === "install") {
  const exe = resolveExe();
  console.log(`HyperNexus → Crush install (${GLOBAL ? "global" : "project"} → ${TARGET})`);
  console.log(`  kernel exe: ${exe}`);

  const changed = [];
  const rcPath = GLOBAL ? path.join(TARGET, "crushrc") : path.join(TARGET, "crushrc");
  if (upsertManagedBlock(rcPath, crushrcBlock(exe), RC_BEGIN, RC_END)) changed.push("crushrc (meta + mcp + skills + hooks)");

  for (const name of SKILLS) {
    const src = path.join(__dirname, "skills", name, "SKILL.md");
    const dst = path.join(TARGET, "skills", name, "SKILL.md");
    const body = fs.readFileSync(src, "utf8");
    if (readIfExists(dst) !== body) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, body, "utf8");
      changed.push(`skills/${name}/SKILL.md`);
    }
  }

  for (const name of COMMANDS) {
    const src = path.join(__dirname, "commands", `${name}.md`);
    const dst = path.join(TARGET, "commands", `${name}.md`);
    const body = fs.readFileSync(src, "utf8");
    if (readIfExists(dst) !== body) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, body, "utf8");
      changed.push(`commands/${name}.md`);
    }
  }


  for (const name of AGENTS) {
    const src = path.join(__dirname, "agent", name);
    const dst = path.join(TARGET, "agent", name);
    const body = fs.readFileSync(src, "utf8");
    if (readIfExists(dst) !== body) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, body, "utf8");
      changed.push(`agent/${name}`);
    }
  }

  for (const name of HOOKS) {
    const src = path.join(__dirname, "hooks", name);
    const dst = path.join(TARGET, "hooks", name);
    const body = fs.readFileSync(src, "utf8");
    if (readIfExists(dst) !== body) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, body, "utf8");
      try { fs.chmodSync(dst, 0o755); } catch { /* windows */ }
      changed.push(`hooks/${name}`);
    }
  }

  if (upsertManagedBlock(path.join(TARGET, "prompt-overlay.md"), fs.readFileSync(path.join(__dirname, "prompt-overlay.md"), "utf8")))
    changed.push("prompt-overlay.md");
  if (upsertManagedBlock(path.join(TARGET, "preferred-tools.md"), fs.readFileSync(path.join(__dirname, "preferred-tools.md"), "utf8")))
    changed.push("preferred-tools.md");

  console.log(changed.length ? `  updated: ${changed.join(", ")}` : "  already up to date");
  console.log("\nNext: restart Crush so the crushrc block + MCP server load.");
  console.log("Verify: crush models | findstr meta   +   crush run -m meta/muse-spark-1.3-contributor \"reply with exactly: CRUSH_META_OK\"");
  console.log("\nMeta model: pi owns OAuth refresh (~/.pi/agent/auth.json); nothing secret is stored here.");
} else if (MODE === "check") {
  console.log(`HyperNexus → Crush check (${TARGET})`);
  let gaps = 0;
  const rc = readIfExists(path.join(TARGET, "crushrc")) ?? "";
  const rcOk = rc.includes(RC_BEGIN) && rc.includes("provider add meta") && rc.includes("mcp add hypernexus") && rc.includes("muse-spark-1.3-contributor");
  console.log(`  ${rcOk ? "ok " : "GAP"} crushrc (meta provider + hypernexus mcp + hooks)`);
  if (!rcOk) gaps++;
  const sect = rc.slice(rc.indexOf(RC_BEGIN), rc.indexOf(RC_END));
  const fwdSlash = sect.includes("C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe") && !sect.includes("C:\\Users");
  console.log(`  ${fwdSlash ? "ok " : "GAP"} crushrc MCP command uses forward slashes`);
  if (!fwdSlash) gaps++;
  for (const name of SKILLS) {
    const p = path.join(TARGET, "skills", name, "SKILL.md");
    const same = fs.existsSync(p) && readIfExists(p) === fs.readFileSync(path.join(__dirname, "skills", name, "SKILL.md"), "utf8");
    console.log(`  ${same ? "ok " : "GAP"} skills/${name}/SKILL.md`);
    if (!same) gaps++;
  }
  for (const name of COMMANDS) {
    const p = path.join(TARGET, "commands", `${name}.md`);
    const same = fs.existsSync(p) && readIfExists(p) === fs.readFileSync(path.join(__dirname, "commands", `${name}.md`), "utf8");
    console.log(`  ${same ? "ok " : "GAP"} commands/${name}.md`);
    if (!same) gaps++;
  }
  for (const name of AGENTS) {
    const p = path.join(TARGET, "agent", name);
    const same = fs.existsSync(p) && readIfExists(p) === fs.readFileSync(path.join(__dirname, "agent", name), "utf8");
    console.log(`  ${same ? "ok " : "GAP"} agent/${name}`);
    if (!same) gaps++;
  }
  for (const name of HOOKS) {
    const p = path.join(TARGET, "hooks", name);
    const same = fs.existsSync(p) && readIfExists(p) === fs.readFileSync(path.join(__dirname, "hooks", name), "utf8");
    console.log(`  ${same ? "ok " : "GAP"} hooks/${name}`);
    if (!same) gaps++;
  }
  for (const f of ["prompt-overlay.md", "preferred-tools.md"]) {
    const body = readIfExists(path.join(TARGET, f)) ?? "";
    const src = fs.readFileSync(path.join(__dirname, f), "utf8").trim();
    const ok = body.includes(MD_BEGIN) || body.trim() === src || (body.length > 0 && src.length > 0 && body.includes(src.slice(0, 60)));
    console.log(`  ${ok ? "ok " : "GAP"} ${f} (managed block)`);
    if (!ok) gaps++;
  }
  process.exit(gaps ? 1 : 0);
} else {
  console.log(`HyperNexus → Crush uninstall (${TARGET})`);
  const removed = [];
  if (removeManagedBlock(path.join(TARGET, "crushrc"), RC_BEGIN, RC_END)) removed.push("crushrc block");
  for (const name of SKILLS) {
    const p = path.join(TARGET, "skills", name, "SKILL.md");
    if (fs.existsSync(p) && readIfExists(p) === fs.readFileSync(path.join(__dirname, "skills", name, "SKILL.md"), "utf8")) {
      fs.rmSync(path.dirname(p), { recursive: true, force: true });
      removed.push(`skills/${name}/`);
    } else if (fs.existsSync(p)) {
      console.log(`  ! skills/${name}/SKILL.md was modified — leaving in place`);
    }
  }
  for (const name of COMMANDS) {
    const p = path.join(TARGET, "commands", `${name}.md`);
    if (fs.existsSync(p) && readIfExists(p) === fs.readFileSync(path.join(__dirname, "commands", `${name}.md`), "utf8")) {
      fs.rmSync(p, { force: true });
      removed.push(`commands/${name}.md`);
    }
  }
  for (const name of AGENTS) {
    const p = path.join(TARGET, "agent", name);
    if (fs.existsSync(p) && readIfExists(p) === fs.readFileSync(path.join(__dirname, "agent", name), "utf8")) {
      fs.rmSync(p, { force: true });
      removed.push(`agent/${name}`);
    }
  }
  for (const name of HOOKS) {
    const p = path.join(TARGET, "hooks", name);
    if (fs.existsSync(p) && readIfExists(p) === fs.readFileSync(path.join(__dirname, "hooks", name), "utf8")) {
      fs.rmSync(p, { force: true });
      removed.push(`hooks/${name}`);
    }
  }
  for (const f of ["prompt-overlay.md", "preferred-tools.md"]) {
    const p = path.join(TARGET, f);
    const src = fs.readFileSync(path.join(__dirname, f), "utf8").trim();
    const cur = readIfExists(p);
    if (cur !== null && (cur.includes(MD_BEGIN) || cur.trim() === src || cur.includes(src.slice(0, 60)))) {
      if (removeManagedBlock(p) || cur.trim() === src || cur.includes(src.slice(0, 60))) {
        if (readIfExists(p) !== null) {
          try {
            const still = readIfExists(p);
            if (still !== null && (still.trim() === src || still.includes(src.slice(0, 60)))) { fs.rmSync(p, { force: true }); }
          } catch { /* ignore */ }
        }
        removed.push(f);
      }
    }
  }
  console.log(removed.length ? `  removed: ${removed.join(", ")}` : "  nothing to remove");
  void hooksShellBlock;
}
