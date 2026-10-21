#!/usr/bin/env node
/**
 * install.mjs — HyperNexus → Codewhale integration installer
 * ===========================================================
 * Installs the HyperNexus MCP server config, plugin bundle, skills, and prompt
 * overlay for the Codewhale harness. Idempotent: the AGENTS.md prompt block is
 * marked `<!-- hypernexus:begin -->` / `<!-- hypernexus:end -->` and can be
 * re-run or removed safely; everything else is byte-compared before writing.
 *
 * Modes:
 *   node addons/codewhale/install.mjs               install into <repo>/.codewhale/
 *   node addons/codewhale/install.mjs --global      install into ~/.codewhale/
 *   node addons/codewhale/install.mjs --check       verify installation (exit 1 on gaps)
 *   node addons/codewhale/install.mjs --uninstall   remove managed blocks/files
 *
 * What it installs (project → .codewhale/, global → ~/.codewhale/):
 *   mcp.json                       MCP server registration (mcpServers.hypernexus, stdio)
 *   plugins/hypernexus/            plugin bundle (Agent Plugins v1.0.0 plugin.json +
 *                                  legacy plugin.toml, mcp.json, commands/*.md, skills/)
 *   skills/<name>/SKILL.md         3 skills mirrored for direct (unqualified) discovery
 *   (project only) AGENTS.md       managed prompt-overlay block
 *
 * Version stamping: plugin.json/plugin.toml are stamped from /VERSION at install
 * time so the bundle can never drift from the kernel version.
 *
 * After install: restart the Codewhale session so the MCP server connects, and run
 * `/plugin validate hypernexus` → `/plugin show hypernexus` → `/plugin enable
 * hypernexus` (trust review is the person's call) to activate commands + bundle skills.
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
const TARGET = GLOBAL ? path.join(HOME, ".codewhale") : path.join(REPO_ROOT, ".codewhale");
const BUNDLE = path.join(TARGET, "plugins", "hypernexus");

const BEGIN = "<!-- hypernexus:begin";
const END = "<!-- hypernexus:end -->";
const SKILLS = ["hypernexus", "hypernexus-ops", "hypernexus-workflows"];
const COMMANDS = ["hn-status", "hn-store", "hn-search", "hn-tools", "hn-session", "hn-context", "hn-summary", "hn-purge"];

// ── helpers ──────────────────────────────────────────────────────────────

function resolveExe() {
  const exe = process.platform === "win32" ? "hypernexus.exe" : "hypernexus";
  const candidate = path.join(REPO_ROOT, "bin", exe);
  return fs.existsSync(candidate) ? candidate : exe; // fall back to PATH
}

function repoVersion() {
  try {
    return fs.readFileSync(path.join(REPO_ROOT, "VERSION"), "utf8").trim();
  } catch {
    return "0.0.0";
  }
}

function readIfExists(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function writeIfChanged(dst, body) {
  if (readIfExists(dst) === body) return false;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, body, "utf8");
  return true;
}

function upsertManagedBlock(filePath, blockText) {
  const block = blockText.trim();
  const existing = readIfExists(filePath) ?? "";
  const beginIdx = existing.indexOf(BEGIN);
  const endIdx = existing.indexOf(END);
  let next;
  if (beginIdx >= 0 && endIdx > beginIdx) {
    next = existing.slice(0, beginIdx) + block + existing.slice(endIdx + END.length);
  } else {
    next = existing.trimEnd() + (existing.trimEnd() ? "\n\n" : "") + block + "\n";
  }
  return writeIfChanged(filePath, next);
}

function removeManagedBlock(filePath) {
  const existing = readIfExists(filePath);
  if (existing === null) return false;
  const beginIdx = existing.indexOf(BEGIN);
  const endIdx = existing.indexOf(END);
  if (beginIdx < 0 || endIdx < beginIdx) return false;
  const next = (existing.slice(0, beginIdx) + existing.slice(endIdx + END.length)).replace(/\n{3,}/g, "\n\n");
  // If the file held only our managed block, remove the empty husk entirely.
  if (next.trim() === "") {
    fs.rmSync(filePath, { force: true });
    return true;
  }
  fs.writeFileSync(filePath, next, "utf8");
  return true;
}

function mcpEntry(exe) {
  return {
    type: "stdio",
    command: exe,
    args: ["mcp"],
    env: {
      HYPERNEXUS_WORKSPACE_ROOT: REPO_ROOT,
      HYPERNEXUS_URL: "http://127.0.0.1:7778",
    },
  };
}

function mergeMcpConfig(filePath, exe) {
  let cfg = {};
  const existing = readIfExists(filePath);
  if (existing) {
    try {
      cfg = JSON.parse(existing);
    } catch {
      console.error(`  ! ${filePath} is not valid JSON — leaving untouched`);
      return false;
    }
  }
  cfg.mcpServers = cfg.mcpServers ?? {};
  const want = mcpEntry(exe);
  const cur = cfg.mcpServers.hypernexus;
  const same =
    cur &&
    cur.command === want.command &&
    JSON.stringify(cur.args) === JSON.stringify(want.args) &&
    cur.type === want.type &&
    JSON.stringify(cur.env) === JSON.stringify(want.env);
  cfg.mcpServers.hypernexus = want;
  return same && existing ? false : writeIfChanged(filePath, JSON.stringify(cfg, null, 2) + "\n");
}

function removeMcpConfig(filePath) {
  const existing = readIfExists(filePath);
  if (!existing) return false;
  try {
    const cfg = JSON.parse(existing);
    if (!cfg.mcpServers?.hypernexus) return false;
    delete cfg.mcpServers.hypernexus;
    fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

function bundleFileMap(exe, version) {
  // src (in addons/codewhale) → body transform → dst (under BUNDLE)
  const files = [];
  const pluginJson = JSON.parse(fs.readFileSync(path.join(__dirname, "plugin", "plugin.json"), "utf8"));
  pluginJson.version = version;
  files.push(["plugin.json", JSON.stringify(pluginJson, null, 2) + "\n"]);

  const pluginToml = fs
    .readFileSync(path.join(__dirname, "plugin", "plugin.toml"), "utf8")
    .replace(/^version = ".*"$/m, `version = "${version}"`);
  files.push(["plugin.toml", pluginToml]);

  const bundleMcp = JSON.parse(fs.readFileSync(path.join(__dirname, "plugin", "mcp.json"), "utf8"));
  bundleMcp.mcpServers.hypernexus.command = exe;
  bundleMcp.mcpServers.hypernexus.cwd = REPO_ROOT;
  bundleMcp.mcpServers.hypernexus.env = mcpEntry(exe).env;
  files.push(["mcp.json", JSON.stringify(bundleMcp, null, 2) + "\n"]);

  for (const c of COMMANDS) {
    files.push([`commands/${c}.md`, fs.readFileSync(path.join(__dirname, "plugin", "commands", `${c}.md`), "utf8")]);
  }
  for (const s of SKILLS) {
    files.push([`skills/${s}/SKILL.md`, fs.readFileSync(path.join(__dirname, "skills", s, "SKILL.md"), "utf8")]);
  }
  files.push(["README.md", fs.readFileSync(path.join(__dirname, "plugin", "README.md"), "utf8")]);
  return files;
}

function skillsStatus(dir) {
  return SKILLS.map((name) => {
    const p = path.join(dir, "skills", name, "SKILL.md");
    return { name, p, ok: fs.existsSync(p) };
  });
}

// ── modes ────────────────────────────────────────────────────────────────

if (MODE === "install") {
  const exe = resolveExe();
  const version = repoVersion();
  console.log(`HyperNexus → Codewhale install (${GLOBAL ? "global" : "project"} → ${TARGET})`);
  console.log(`  kernel exe: ${exe} (v${version})`);

  const changed = [];
  if (mergeMcpConfig(path.join(TARGET, "mcp.json"), exe)) changed.push("mcp.json");

  for (const [rel, body] of bundleFileMap(exe, version)) {
    if (writeIfChanged(path.join(BUNDLE, rel), body)) changed.push(`plugins/hypernexus/${rel}`);
  }

  for (const name of SKILLS) {
    const body = fs.readFileSync(path.join(__dirname, "skills", name, "SKILL.md"), "utf8");
    if (writeIfChanged(path.join(TARGET, "skills", name, "SKILL.md"), body)) changed.push(`skills/${name}/SKILL.md`);
  }

  if (!GLOBAL) {
    const overlay = fs.readFileSync(path.join(__dirname, "prompt-overlay.md"), "utf8");
    if (upsertManagedBlock(path.join(REPO_ROOT, "AGENTS.md"), overlay)) changed.push("AGENTS.md (managed block)");
  }

  console.log(changed.length ? `  updated: ${changed.join(", ")}` : "  already up to date");
  console.log("\nNext: restart the Codewhale session so the `hypernexus` MCP server connects.");
  if (!GLOBAL) console.log("Then: /plugin validate hypernexus → /plugin show hypernexus → /plugin enable hypernexus (trust review is yours).");
} else if (MODE === "check") {
  console.log(`HyperNexus → Codewhale check (${TARGET})`);
  let gaps = 0;
  const mcpPath = path.join(TARGET, "mcp.json");
  const raw = readIfExists(mcpPath);
  let mcpOk = false;
  if (raw) {
    try {
      const cfg = JSON.parse(raw);
      const entry = cfg.mcpServers?.hypernexus;
      mcpOk = !!entry?.command && JSON.stringify(entry.args) === JSON.stringify(["mcp"]);
      if (mcpOk && entry.command.includes(path.sep) && !fs.existsSync(entry.command)) {
        console.log(`  ! mcp.json command does not exist: ${entry.command}`);
        mcpOk = false;
      }
    } catch {
      console.log("  ! mcp.json is not valid JSON");
    }
  }
  console.log(`  ${mcpOk ? "ok " : "GAP"} mcp.json (hypernexus server)`);
  if (!mcpOk) gaps++;

  const version = repoVersion();
  for (const [rel, body] of bundleFileMap(resolveExe(), version)) {
    const ok = readIfExists(path.join(BUNDLE, rel)) === body;
    console.log(`  ${ok ? "ok " : "GAP"} plugins/hypernexus/${rel}`);
    if (!ok) gaps++;
  }

  for (const s of skillsStatus(TARGET)) {
    const ok = s.ok && readIfExists(s.p) === fs.readFileSync(path.join(__dirname, "skills", s.name, "SKILL.md"), "utf8");
    console.log(`  ${ok ? "ok " : "GAP"} skills/${s.name}/SKILL.md`);
    if (!ok) gaps++;
  }

  if (!GLOBAL) {
    const body = readIfExists(path.join(REPO_ROOT, "AGENTS.md")) ?? "";
    const ok = body.includes(BEGIN) && body.includes(END);
    console.log(`  ${ok ? "ok " : "GAP"} AGENTS.md (managed block)`);
    if (!ok) gaps++;
  }
  process.exit(gaps ? 1 : 0);
} else {
  console.log(`HyperNexus → Codewhale uninstall (${TARGET})`);
  const removed = [];
  if (removeMcpConfig(path.join(TARGET, "mcp.json"))) removed.push("mcp.json");
  if (fs.existsSync(BUNDLE)) {
    fs.rmSync(BUNDLE, { recursive: true, force: true });
    removed.push("plugins/hypernexus/");
  }
  for (const s of skillsStatus(TARGET)) {
    if (!s.ok) continue;
    // Only remove skills that are still byte-identical to ours — never destroy edits.
    const ours = fs.readFileSync(path.join(__dirname, "skills", s.name, "SKILL.md"), "utf8");
    if (readIfExists(s.p) === ours) {
      fs.rmSync(path.dirname(s.p), { recursive: true, force: true });
      removed.push(`skills/${s.name}/`);
    } else {
      console.log(`  ! skills/${s.name}/SKILL.md was modified — leaving in place`);
    }
  }
  if (!GLOBAL && removeManagedBlock(path.join(REPO_ROOT, "AGENTS.md"))) removed.push("AGENTS.md block");
  console.log(removed.length ? `  removed: ${removed.join(", ")}` : "  nothing to remove");
}
