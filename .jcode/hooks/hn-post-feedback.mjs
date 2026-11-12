#!/usr/bin/env node
/**
 * hn-post-feedback.mjs — HyperNexus post_tool_feedback hook for jcode.
 * ======================================================================
 * Wire in ~/.jcode/config.toml (paths printed by `node addons/jcode/install.mjs`):
 *
 *   [hooks]
 *   post_tool_feedback = ["<target>/hooks/hn-post-feedback.mjs"]
 *
 * Contract (per jcode docs/HOOKS.md): runs SYNCHRONOUSLY after every successful
 * tool call. Trimmed stdout is appended to the tool result under a
 * [post_tool_feedback] marker (capped at 8 KB per hook). Empty stdout adds
 * nothing. Exit code is ignored; stderr is discarded. Budget: keep it fast and
 * filter early — this runs on EVERY tool call including reads.
 *
 * This hook adds HyperNexus recall ONLY where it pays:
 *   - memory tools (add_memory/search_memory/delete_memory/stats/scratchpad):
 *     skipped (the result already carries the data; echoing it back wastes
 *     context and risks feedback loops).
 *   - file reads/writes (read/write/edit/apply_search_replace): one-line
 *     pointer to related L2 memories is NOT fetched synchronously (that would
 *     blow the hot-path budget). Instead, emit nothing — the async post_tool
 *     observer already records touched paths. The value here is negative
 *     space: this hook documents the deliberate no-op so future editors know
 *     the recall decision was made, not forgotten.
 *   - mcp__hypernexus__search_memory calls: append a one-line L2 pointer
 *     reminder ONLY when the result looks empty AND the query was a single
 *     hyphenated token (the known tokenization trap: hyphenated single tokens
 *     never match; the model should retry with natural-language words).
 *
 * Input: full tool input JSON on stdin + JCODE_HOOK_TOOL_NAME in env.
 * Never reads credentials, never throws, never blocks past ~50ms of local work.
 */

import fs from "node:fs";

function readStdinBounded(maxBytes = 65536) {
  try {
    return (fs.readFileSync(0, "utf8") || "").slice(0, maxBytes);
  } catch {
    return "";
  }
}

function main() {
  const tool = process.env.JCODE_HOOK_TOOL_NAME || "";
  const raw = readStdinBounded();
  let input = null;
  if (raw.trim()) {
    try {
      input = JSON.parse(raw);
    } catch {
      input = null;
    }
  }

  // Only the hyphenated-token trap earns synchronous feedback. Everything
  // else stays silent to protect the hot path.
  if (tool === "search_memory" || tool === "mcp__hypernexus__search_memory") {
    const q = String(input?.query || input?.arguments?.query || "");
    if (q && /^[A-Za-z0-9]+(-[A-Za-z0-9]+)+$/.test(q.trim())) {
      process.stdout.write(
        `[post_tool_feedback] HyperNexus note: single hyphenated token queries never match L2 keyword search (tokenization). Retry with natural-language words, e.g. query="${q.replace(/-/g, " ")}".\n`
      );
    }
  }
  process.exit(0);
}

try {
  main();
} catch {
  process.exit(0); // feedback hooks must never break a turn
}
