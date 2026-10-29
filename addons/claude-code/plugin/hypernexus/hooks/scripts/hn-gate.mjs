#!/usr/bin/env node
/**
 * hn-gate.mjs — HyperNexus PreToolUse RBAC gate for Claude Code.
 *
 * Fail-open allow-gate with a deny-list for destructive shell patterns.
 * Reads the hook JSON from stdin (Claude Code hook input: tool_name +
 * tool_input), prints a JSON decision to stdout, and exits:
 *   exit 0 = allow (stdout parsed as JSON decision)
 *   exit 2 = deny (stderr = reason)
 * Any internal error exits 0 — a broken guard must never brick sessions.
 *
 * No network I/O (hot path stays fast), never reads credentials, never throws.
 *
 * Wire in hooks/hooks.json as a PreToolUse matcher for Bash (and any
 * shell-execution tool) BEFORE hn-log.mjs so a denial wins.
 */
import { readFileSync } from "node:fs";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// Destructive patterns denied at the gate. Kept tight on purpose: this is a
// last-resort guard, not a sandbox — Claude Code's own permission system is
// the primary control.
const DENY_RES = [
  /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\s+(\/|~)(\s|$)/i, // rm -rf / or ~
  /\bmkfs\b/i,
  /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?/i, // fork bomb
  /\bformat\s+[a-z]:/i, // windows drive format
  /\bdel\s+\/[fsq]/i, // windows recursive/force delete flags
];

function commandTextOf(input) {
  const t = input?.tool_input ?? input?.toolInput ?? {};
  if (typeof t === "string") return t;
  for (const k of ["command", "cmd", "script", "code", "commandLine"]) {
    if (typeof t[k] === "string" && t[k]) return t[k];
  }
  return "";
}

function main() {
  let input = {};
  try {
    const raw = readStdin();
    if (raw) input = JSON.parse(raw);
  } catch {
    // Unparseable input: fail open.
    process.stdout.write('{"decision":"allow"}');
    return;
  }
  const tool = String(input.tool_name || input.tool || "");
  if (!/^(bash|shell|run_shell_command|exec)$/i.test(tool)) {
    process.stdout.write('{"decision":"allow"}');
    return;
  }
  const cmd = commandTextOf(input);
  for (const re of DENY_RES) {
    if (re.test(cmd)) {
      process.stderr.write(`blocked by hypernexus-gate: destructive shell pattern denied (${tool})\n`);
      process.exit(2);
    }
  }
  process.stdout.write('{"decision":"allow"}');
}

main();
