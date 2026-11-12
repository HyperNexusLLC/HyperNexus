#!/usr/bin/env node
// HyperNexus mini-swe-agent hook dispatcher. Usage: node hypernexus-hook.mjs <Event>
// Reads hook JSON from stdin. Fast, never throws, exits 0 —
// except PreToolUse on destructive commands, which exits 2 to block.
// Fire-and-forget kernel calls use short timeouts so hooks never stall turns.
// NOTE: the event envelope + hooks.json command shape mirror the
// Claude-Code-compatible plugin format this addon ships (see
// config/hypernexus.plugin.json); only the client identity strings below
// are mini-swe-agent. hooks.json still uses ${CLAUDE_PLUGIN_ROOT} as the
// plugin-root variable expanded by that runner — do not rename it blindly.
import { readFileSync } from "node:fs";

const EVENT = process.argv[2] || "Unknown";
const BASE = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";

let input = {};
try {
  const raw = readFileSync(0, "utf8");
  if (raw.trim()) input = JSON.parse(raw);
} catch { /* ignore */ }

async function kernel(endpoint, body, ms = 2500) {
  try {
    const res = await fetch(BASE + endpoint, {
      method: body === undefined ? "GET" : "POST",
      signal: AbortSignal.timeout(ms),
      headers: { "Content-Type": "application/json", "X-HyperNexus-Client": "mini-swe-agent/1.0" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return await res.json().catch(() => null);
  } catch { return null; }
}
function out(obj) { try { console.log(JSON.stringify(obj)); } catch {} }

const DANGEROUS = [
  /\brm\s+-[a-z]*r/i, /\bmkfs\b/i, /\bdrop\s+(table|database)\b/i,
  /\btruncate\s+table\b/i, /\bgit\s+push\s+.*--force\b/i, /\bgit\s+reset\s+--hard\b/i,
  /\bformat\s+[a-z]:/i, /\bdel\s+\/[sf]\b/i, /\bshutdown\b|\breboot\b/i,
];

switch (EVENT) {
  case "SessionStart": {
    // Best-effort status line; never blocks startup.
    const h = await kernel("/health", undefined, 2000);
    if (h?.ok) out({ additionalContext: `HyperNexus kernel v${h.version} online (${h.uptimeSec}s up). L2 memory + tool routing available via hypernexus MCP.` });
    break;
  }
  case "UserPromptSubmit": {
    const prompt = String(input.prompt || input.message || "");
    const m = prompt.match(/@memory:([\w.:-]+)/);
    if (m) {
      const rows = await kernel(`/api/memory/fts-search?q=${encodeURIComponent(m[1])}&limit=2`, undefined, 2000);
      const list = rows?.data ?? rows ?? [];
      if (Array.isArray(list) && list.length) {
        out({ additionalContext: `[HyperNexus memory: ${m[1]}]\n` + list.slice(0, 2).map(r => `- ${JSON.stringify(r).slice(0, 220)}`).join("\n") });
      }
    }
    break;
  }
  case "PreToolUse": {
    const hay = `${input.tool || ""} ${JSON.stringify(input.input || input.parameters || {})}`;
    const hit = DANGEROUS.find(re => re.test(hay));
    if (hit) {
      console.error(`[hypernexus] blocked destructive command (matched ${hit.source}). Confirm explicitly to proceed.`);
      process.exit(2);
    }
    break;
  }
  case "PostToolUse": {
    const text = String(input.output ?? input.result ?? "");
    const tool = String(input.tool ?? "unknown");
    if (text.length > 400 && !tool.startsWith("hypernexus")) {
      // Fire-and-forget persist; do not await.
      kernel("/api/memory/facts/add", {
        content: text.slice(0, 4000), title: `tool-result:${tool.slice(0, 64)}`,
        tags: ["client:mini-swe-agent", `tool:${tool.slice(0, 40)}`], namespace: "project",
      }, 2500).catch(() => {});
    }
    break;
  }
  case "PostToolUseFailure": {
    const tool = String(input.tool ?? "unknown");
    kernel("/api/memory/observations/record", {
      content: `Tool ${tool} failed: ${String(input.error ?? input.output ?? "").slice(0, 500)}`,
      type: "warning", title: `tool-failure:${tool.slice(0, 64)}`, toolName: tool,
      metadata: { source: "mini-swe-agent-hook" },
    }, 2500).catch(() => {});
    break;
  }
  case "Stop": {
    // Nudge a summary persist; the model decides.
    out({ additionalContext: "Consider persisting any non-obvious session outcome via hypernexus add_memory before ending." });
    break;
  }
  case "PreCompact": {
    out({ additionalContext: "HyperNexus: goal + open decisions are in L1 scratchpad (current_task) and L2 memory — re-harvest after compact." });
    break;
  }
  case "SessionEnd":
  case "Notification":
    break;
  default:
    break;
}
process.exit(0);
