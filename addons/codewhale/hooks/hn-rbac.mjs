#!/usr/bin/env node
/**
 * hn-rbac.mjs — HyperNexus RBAC guard for Codewhale (deny-list, fail-open).
 *
 * By-convention twin of the codex hn-rbac.sh: Codewhale bundles expose no
 * PreToolUse hook API, so run this manually before destructive shell work, or
 * follow it as policy. Reads hook JSON from stdin (tool_name + tool_input),
 * prints a JSON decision to stdout. Exit 2 blocks (stderr = reason), exit 0
 * allows. Never reads credentials, never throws, no network I/O.
 *
 * Usage: echo '{"tool_name":"bash","tool_input":{"command":"..."}}' | node hn-rbac.mjs
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
      process.stderr.write(`blocked by hypernexus-rbac: destructive shell pattern denied (${tool})\n`);
      process.exit(2);
    }
  }
  process.stdout.write('{"decision":"allow"}');
}

main();
