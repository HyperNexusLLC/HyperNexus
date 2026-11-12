#!/usr/bin/env node
/**
 * hn-log.mjs — HyperNexus Claude Code hook: log session activity to the kernel.
 *
 * Fire-and-forget: budgeted fetches, never throws, always exits 0, prints
 * nothing secret (prints nothing at all on success). Reads hook JSON from
 * stdin (Claude Code hook input) and POSTs to:
 *   POST {HYPERNEXUS_URL}/api/memory/facts/add          (tags array)
 *   POST {HYPERNEXUS_URL}/api/memory/observations/record
 * Falls back to facts/add when observations are unavailable.
 *
 * NEVER reads auth.json, token files, or secret env VALUES. Only the
 * HYPERNEXUS_URL endpoint name (default http://127.0.0.1:7778) is used.
 *
 * Usage: node hn-log.mjs <session-start|prompt-submit|file-change|session-stop|subagent-stop>
 */
import { readFileSync } from "node:fs";

const BASE = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";
const BUDGET_MS = 3000;
const KIND = process.argv[2] || "event";

function readStdin() {
  try {
    // /dev/stdin is unavailable on Windows; fd 0 works everywhere.
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function clamp(s, n) {
  s = String(s ?? "");
  return s.length > n ? s.slice(0, n) : s;
}

async function post(path, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), BUDGET_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  let input = {};
  try {
    const raw = readStdin();
    if (raw) input = JSON.parse(raw);
  } catch {
    input = {};
  }

  const toolName = input.tool_name || input.tool || "";
  const filePath =
    input.tool_input?.file_path || input.tool_input?.path || input.file || "";
  const prompt = clamp(input.prompt || input.user_prompt || "", 300);

  let title = `claude-code:${KIND}`;
  let content = `Claude Code hook event: ${KIND}.`;
  let tags = ["client:claude-code", `hook:${KIND}`];
  let type = "progress";

  switch (KIND) {
    case "session-start":
      content = "Claude Code session started with the HyperNexus plugin active.";
      tags.push("session,start");
      type = "session";
      break;
    case "prompt-submit":
      content = prompt
        ? `User prompt submitted: ${prompt}`
        : "User prompt submitted.";
      tags.push("session,prompt");
      break;
    case "file-change":
      content = filePath
        ? `File modified via ${toolName || "edit tool"}: ${clamp(filePath, 300)}`
        : `File modified via ${toolName || "edit tool"}.`;
      tags.push("tool:file-change");
      if (filePath) tags.push(`file:${clamp(filePath, 80)}`);
      break;
    case "session-stop":
      content = "Claude Code session ended.";
      tags.push("session,stop");
      type = "session";
      break;
    case "subagent-stop":
      content = "Claude Code subagent finished.";
      tags.push("session,subagent");
      break;
    default:
      break;
  }

  const observation = {
    type,
    title,
    content: clamp(content, 2000),
    narrative: clamp(content, 600),
    toolName: `claude-code.${KIND}`,
    concepts: ["claude-code-activity"],
    ...(filePath ? { filesModified: [clamp(filePath, 300)] } : {}),
    metadata: { source: "claude-code-plugin", client: "claude-code" },
  };

  const ok = await post("/api/memory/observations/record", observation);
  if (!ok) {
    await post("/api/memory/facts/add", {
      title,
      content: observation.content,
      tags,
      namespace: "project",
    });
  }
  // continue:true — hooks must never block the session.
}

await main();
process.exit(0);
