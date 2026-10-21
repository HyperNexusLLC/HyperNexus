#!/usr/bin/env node
/**
 * install.mjs — HyperNexus → Jcode integration installer
 * ========================================================
 * Installs the HyperNexus MCP server config plus prompt/skill surfaces for the
 * Jcode harness. Idempotent: managed blocks are marked with
 * `<!-- hypernexus:begin -->` / `<!-- hypernexus:end -->` and can be re-run or
 * removed safely.
 *
 * Modes:
 *   node addons/jcode/install.mjs               install into this project (.jcode/)
 *   node addons/jcode/install.mjs --global      install into ~/.jcode/
 *   node addons/jcode/install.mjs --check       verify installation (exit 1 on gaps)
 *   node addons/jcode/install.mjs --uninstall   remove managed blocks/files
 *
 * What it installs (project mode → .jcode/, global mode → ~/.jcode/):
 *   mcp.json              MCP server registration (command: <root>/bin/hypernexus.exe mcp)
 *   skills/<name>/SKILL.md  3 skills: hypernexus, hypernexus-ops, hypernexus-workflows
 *   prompt-overlay.md     discipline loop + tool map (managed block)
 *   preferred-tools.md    tool routing preferences (managed block)
 *   (global only) swarm-prompt-block.md → ~/.jcode/swarm-prompt.md (managed block)
 *
 * After install: restart the Jcode session (or run the `mcp` tool with
 * action "reload") so the MCP server connects.
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
const TARGET = GLOBAL ? path.join(HOME, ".jcode") : path.join(REPO_ROOT, ".jcode");

const BEGIN = "<!-- hypernexus:begin";
const END = "<!-- hypernexus:end -->";

// ── helpers ──────────────────────────────────────────────────────────────

function resolveExe() {
  const exe = process.platform === "win32" ? "hypernexus.exe" : "hypernexus";
  const candidate = path.join(REPO_ROOT, "bin", exe);
  return fs.existsSync(candidate) ? candidate : exe; // fall back to PATH
}

function readIfExists(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next, "utf8");
  return existing !== next;
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
  const want = {
    command: exe,
    args: ["mcp"],
    env: {
      HYPERNEXUS_WORKSPACE_ROOT: REPO_ROOT,
      HYPERNEXUS_URL: "http://127.0.0.1:7778",
    },
  };
  const cur = cfg.mcpServers.hypernexus;
  const same = cur && cur.command === want.command && JSON.stringify(cur.args) === JSON.stringify(want.args);
  cfg.mcpServers.hypernexus = want;
  if (!same || !existing) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    return true;
  }
  return false;
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

const SKILLS = ["hypernexus", "hypernexus-ops", "hypernexus-workflows"];

function skillsStatus() {
  return SKILLS.map((name) => {
    const p = path.join(TARGET, "skills", name, "SKILL.md");
    return { name, p, ok: fs.existsSync(p) };
  });
}

// ── modes ────────────────────────────────────────────────────────────────

if (MODE === "install") {
  const exe = resolveExe();
  console.log(`HyperNexus → Jcode install (${GLOBAL ? "global" : "project"} → ${TARGET})`);
  console.log(`  kernel exe: ${exe}`);

  const changed = [];
  if (mergeMcpConfig(path.join(TARGET, "mcp.json"), exe)) changed.push("mcp.json");

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

  if (upsertManagedBlock(path.join(TARGET, "prompt-overlay.md"), fs.readFileSync(path.join(__dirname, "prompt-overlay.md"), "utf8")))
    changed.push("prompt-overlay.md");
  if (upsertManagedBlock(path.join(TARGET, "preferred-tools.md"), fs.readFileSync(path.join(__dirname, "preferred-tools.md"), "utf8")))
    changed.push("preferred-tools.md");
  if (GLOBAL) {
    const swarmPath = path.join(HOME, ".jcode", "swarm-prompt.md");
    if (upsertManagedBlock(swarmPath, fs.readFileSync(path.join(__dirname, "swarm-prompt-block.md"), "utf8")))
      changed.push("swarm-prompt.md (managed block)");
  }

  console.log(changed.length ? `  updated: ${changed.join(", ")}` : "  already up to date");
  console.log("\nNext: restart the Jcode session, or in-session run the `mcp` tool with {\"action\":\"reload\"}.");
} else if (MODE === "check") {
  console.log(`HyperNexus → Jcode check (${TARGET})`);
  let gaps = 0;
  const mcpPath = path.join(TARGET, "mcp.json");
  const raw = readIfExists(mcpPath);
  let mcpOk = false;
  if (raw) {
    try {
      const cfg = JSON.parse(raw);
      const entry = cfg.mcpServers?.hypernexus;
      mcpOk = !!entry?.command;
      if (mcpOk && !fs.existsSync(entry.command) && entry.command.includes(path.sep))
        console.log(`  ! mcp.json command does not exist: ${entry.command}`);
    } catch {
      console.log("  ! mcp.json is not valid JSON");
    }
  }
  console.log(`  ${mcpOk ? "ok " : "GAP"} mcp.json (hypernexus server)`);
  if (!mcpOk) gaps++;
  for (const s of skillsStatus()) {
    console.log(`  ${s.ok ? "ok " : "GAP"} skills/${s.name}/SKILL.md`);
    if (!s.ok) gaps++;
  }
  for (const f of ["prompt-overlay.md", "preferred-tools.md"]) {
    const body = readIfExists(path.join(TARGET, f)) ?? "";
    const ok = body.includes(BEGIN);
    console.log(`  ${ok ? "ok " : "GAP"} ${f} (managed block)`);
    if (!ok) gaps++;
  }
  if (GLOBAL) {
    const body = readIfExists(path.join(HOME, ".jcode", "swarm-prompt.md")) ?? "";
    const ok = body.includes(BEGIN);
    console.log(`  ${ok ? "ok " : "GAP"} swarm-prompt.md (managed block)`);
    if (!ok) gaps++;
  }
  process.exit(gaps ? 1 : 0);
} else {
  console.log(`HyperNexus → Jcode uninstall (${TARGET})`);
  const removed = [];
  if (removeMcpConfig(path.join(TARGET, "mcp.json"))) removed.push("mcp.json");
  for (const s of skillsStatus()) {
    if (s.ok) {
      fs.rmSync(path.dirname(s.p), { recursive: true, force: true });
      removed.push(`skills/${s.name}/`);
    }
  }
  for (const f of ["prompt-overlay.md", "preferred-tools.md"]) {
    if (removeManagedBlock(path.join(TARGET, f))) removed.push(f);
  }
  if (GLOBAL && removeManagedBlock(path.join(HOME, ".jcode", "swarm-prompt.md"))) removed.push("swarm-prompt.md block");
  console.log(removed.length ? `  removed: ${removed.join(", ")}` : "  nothing to remove");
}
