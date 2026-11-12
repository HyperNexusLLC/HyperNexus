#!/usr/bin/env node
/**
 * hn-pre-tool.mjs — HyperNexus PreToolUse gate for Codewhale (fail-open allow-gate).
 *
 * By-convention twin of hn-rbac.mjs with a tighter tool-name match: use when a
 * caller wants the pre-tool decision shape (`decision` + `reason`) rather than
 * the RBAC audit shape. Exit 0 = allow (stdout parsed as JSON decision),
 * exit 2 = deny (stderr = reason). Any internal error exits 0 — a broken guard
 * must never brick sessions. No network I/O, never reads credentials.
 *
 * Usage: echo '{"tool_name":"bash","tool_input":{"command":"..."}}' | node hn-pre-tool.mjs
 */
import { readFileSync } from "node:fs";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

const DENY_RES = [
  /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\s+(\/|~)(\s|$)/i,
  /\bmkfs\b/i,
  /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?/i,
  /\bformat\s+[a-z]:/i,
  /\bdel\s+\/[fsq]/i,
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
    process.stdout.write(JSON.stringify({ decision: "allow" }));
    return;
  }
  const tool = String(input.tool_name || input.tool || "");
  if (!/^(bash|shell|run_shell_command|exec)$/i.test(tool)) {
    process.stdout.write(JSON.stringify({ decision: "allow" }));
    return;
  }
  const cmd = commandTextOf(input);
  for (const re of DENY_RES) {
    if (re.test(cmd)) {
      process.stdout.write(JSON.stringify({ decision: "deny", reason: `destructive shell pattern denied (${tool})` }));
      process.stderr.write(`blocked by hypernexus-gate: destructive shell pattern denied (${tool})\n`);
      process.exit(2);
    }
  }
  process.stdout.write(JSON.stringify({ decision: "allow" }));
}

main();
