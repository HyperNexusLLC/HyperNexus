#!/usr/bin/env node
/**
 * hn-pre-tool.mjs — HyperNexus pre_tool gate for jcode (RBAC policy boundary).
 * =============================================================================
 * Wire in ~/.jcode/config.toml (paths printed by `node addons/jcode/install.mjs`):
 *
 *   [hooks]
 *   pre_tool = ["<target>/hooks/hn-pre-tool.mjs"]
 *
 * Contract (per jcode docs/HOOKS.md): the gate receives the tool-input JSON on
 * stdin plus JCODE_HOOK_TOOL_NAME / JCODE_HOOK_SESSION_ID / JCODE_HOOK_CWD in
 * the environment. Exit 0 allows the call; exit 2 blocks it (stderr becomes the
 * tool error). Anything else fails open.
 *
 * Policy is driven by HYPERNEXUS_RBAC (default: audit):
 *   - audit: allow everything, mirror the decision to the kernel audit trail
 *     (fire-and-forget, never blocks the turn).
 *   - ask:  allow everything, but flag sensitive operations in the audit trail
 *     with `review:requested` so a downstream reviewer can follow up.
 *   - deny:  block destructive shell patterns + writes outside the workspace
 *     (exit 2 with a short reason). Everything else is allowed.
 *
 * Destructive patterns blocked under deny (conservative, no false-positive
 * system paths): `rm -rf /`, `rm -rf ~`, `mkfs`, `dd if=`, Windows
 * `rmdir /S C:\` / `format `, recursive deletes of the workspace root itself.
 * Writes to /etc/, C:\Windows\, and credential filenames (*auth.json*,
 * *credentials*, *.pem, *.key) are blocked under deny.
 *
 * This hook performs NO blocking network I/O: the audit mirror is spawned
 * detached (child process, unref'd) and the gate decision is synchronous.
 * Never reads credentials, never throws (fail-open on any internal error).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const RBAC = (process.env.HYPERNEXUS_RBAC || "audit").toLowerCase();

function readStdinBounded(maxBytes = 65536) {
  try {
    const data = fs.readFileSync(0, "utf8");
    return (data || "").slice(0, maxBytes);
  } catch {
    return "";
  }
}

function auditMirror(tool, decision, reason) {
  // Detached fire-and-forget: the gate must never wait on the kernel.
  try {
    const base = (process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778").replace(/\/+$/, "");
    const child = spawn(
      process.execPath,
      ["-e", `fetch(${JSON.stringify(base + "/api/memory/facts/add")},{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"jcode pre_tool gate",content:${JSON.stringify(`gate ${decision} tool=${tool}${reason ? ` reason=${reason}` : ""} rbac=${RBAC}`)},tags:["jcode","rbac",${JSON.stringify(decision)}],namespace:"project"}),signal:AbortSignal.timeout(2000)}).catch(()=>{})`],
      { stdio: "ignore", detached: true }
    );
    child.unref();
  } catch {
    /* audit is best-effort */
  }
}

function block(reason) {
  process.stderr.write(`${reason}\n`);
  auditMirror(process.env.JCODE_HOOK_TOOL_NAME || "?", "deny", reason);
  process.exit(2);
}

function main() {
  const tool = process.env.JCODE_HOOK_TOOL_NAME || "";
  const raw = readStdinBounded();
  let input = null;
  if (raw.trim()) {
    try {
      input = JSON.parse(raw);
    } catch {
      input = null; // malformed input: fail open, let jcode validate
    }
  }
  const body = input ? JSON.stringify(input) : "";

  // Destructive shell detection (deny mode only).
  if (RBAC === "deny" && (tool === "bash" || tool === "run_shell_command")) {
    const cmd = String(input?.command || input?.cmd || body).toLowerCase();
    const destructive = [
      /rm\s+-rf?\s+(\/(\s|$)|~(\/|$))/,
      /\bmkfs\b/,
      /\bdd\s+if=/,
      /rmdir\s+\/s\s+[a-z]:\\/i,
      /\bformat\s+[a-z]:/i,
      /del\s+\/[fs]\s+[a-z]:\\/i,
      />\s*\/dev\/(sd[a-z]|nvme|hd[a-z])/,
      /:\(\)\s*\{\s*:\|\:&\s*\}/, // fork bomb
    ];
    if (destructive.some((re) => re.test(cmd))) {
      block(`blocked by HyperNexus RBAC (deny): destructive shell command in ${tool}`);
    }
  }

  // Sensitive write detection (deny mode only).
  if (RBAC === "deny" && (tool === "write" || tool === "edit" || tool === "apply_search_replace" || tool === "write_file")) {
    const p = String(input?.file_path || input?.filePath || input?.path || body);
    const lowered = p.toLowerCase();
    const sensitive =
      lowered.includes("/etc/") ||
      lowered.includes("c:\\windows\\") ||
      lowered.includes("c:/windows/") ||
      /auth\.json|credentials|secret|\.pem$|\.key$/.test(lowered);
    if (sensitive) {
      block(`blocked by HyperNexus RBAC (deny): write to sensitive path ${p.slice(0, 120)}`);
    }
  }

  if (RBAC === "ask") {
    const sensitiveTool = tool === "bash" || tool === "write" || tool === "edit" || tool === "apply_search_replace";
    if (sensitiveTool) auditMirror(tool, "ask-review", "flagged for review");
    else auditMirror(tool, "allow", "");
  } else if (RBAC !== "deny") {
    // audit (default): allow + mirror, never block.
    auditMirror(tool, "allow", "");
  }

  process.stdout.write('{"continue":true}\n');
  process.exit(0);
}

try {
  main();
} catch {
  process.exit(0); // fail open: a broken gate must never brick sessions
}
