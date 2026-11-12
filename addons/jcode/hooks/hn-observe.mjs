#!/usr/bin/env node
/**
 * hn-observe.mjs — HyperNexus observer hook for jcode (full 8-event surface).
 * =============================================================================
 * Wire in ~/.jcode/config.toml (paths printed by `node addons/jcode/install.mjs`):
 *
 *   [hooks]
 *   session_start      = ["<target>/hooks/hn-observe.mjs"]
 *   session_end        = ["<target>/hooks/hn-observe.mjs"]
 *   turn_start         = ["<target>/hooks/hn-observe.mjs"]
 *   turn_end           = ["<target>/hooks/hn-observe.mjs"]
 *   post_tool          = ["<target>/hooks/hn-observe.mjs"]
 *   post_tool_feedback = ["<target>/hooks/hn-post-feedback.mjs"]
 *
 * Contract (per jcode docs/HOOKS.md): observers are spawned detached,
 * fire-and-forget. This script logs lifecycle events to the HyperNexus kernel:
 *   - session_start / session_end → POST /api/memory/facts/add (tags ARRAY)
 *     AND POST /api/memory/observations/record (entity graph).
 *   - turn_start → FTS recall note (fast-path context prime, fire-and-forget).
 *   - turn_end → POST /api/memory/facts/add (compact: status/duration/model,
 *     full token accounting when the provider reports it).
 *   - post_tool → logs failures (JCODE_HOOK_ERROR set / non-ok status) AND
 *     records touched paths (JCODE_HOOK_TOUCHED_PATHS) into observations.
 * Always exits 0 and prints {"continue":true}. Never throws, never blocks,
 * never reads credentials. Kernel-down degrades to silence.
 *
 * NOTE: turn_start/turn_end/token fields come from docs/HOOKS.md env contract:
 *   JCODE_HOOK_MODEL, JCODE_HOOK_SOURCE (chat|run), JCODE_HOOK_STATUS,
 *   JCODE_HOOK_DURATION_MS, JCODE_HOOK_LAST_ASSISTANT_TEXT (4000 chars),
 *   JCODE_HOOK_PROMPT_TOKENS, JCODE_HOOK_INPUT_TOKENS, JCODE_HOOK_OUTPUT_TOKENS,
 *   JCODE_HOOK_CACHE_READ_TOKENS, JCODE_HOOK_CACHE_WRITE_TOKENS,
 *   JCODE_HOOK_TOOL_NAME, JCODE_HOOK_TOOL_CALL_ID, JCODE_HOOK_TOUCHED_PATHS,
 *   JCODE_HOOK_OUTPUT_BYTES, JCODE_HOOK_ERROR.
 */

const BASE = (process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778").replace(/\/+$/, "");
const EVENT = process.env.JCODE_HOOK_EVENT || "";
const SESSION = process.env.JCODE_HOOK_SESSION_ID || "unknown";
const CWD = process.env.JCODE_HOOK_CWD || "";
const BUDGET_MS = 2500;

async function post(path, body) {
  try {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(BUDGET_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function fact(title, content, tags) {
  return post("/api/memory/facts/add", { title, content, tags, namespace: "project" });
}

function observe(entity, content, relations = []) {
  return post("/api/memory/observations/record", { entity, content, relations });
}

function tokens() {
  const pick = (k) => process.env[k] || "";
  const parts = [];
  if (pick("JCODE_HOOK_PROMPT_TOKENS")) parts.push(`prompt=${pick("JCODE_HOOK_PROMPT_TOKENS")}`);
  if (pick("JCODE_HOOK_INPUT_TOKENS")) parts.push(`in=${pick("JCODE_HOOK_INPUT_TOKENS")}`);
  if (pick("JCODE_HOOK_OUTPUT_TOKENS")) parts.push(`out=${pick("JCODE_HOOK_OUTPUT_TOKENS")}`);
  if (pick("JCODE_HOOK_CACHE_READ_TOKENS")) parts.push(`cacheRead=${pick("JCODE_HOOK_CACHE_READ_TOKENS")}`);
  if (pick("JCODE_HOOK_CACHE_WRITE_TOKENS")) parts.push(`cacheWrite=${pick("JCODE_HOOK_CACHE_WRITE_TOKENS")}`);
  return parts.length ? ` tokens[${parts.join(" ")}]` : "";
}

async function main() {
  const short = String(SESSION).slice(0, 12);
  if (EVENT === "session_start") {
    const src = process.env.JCODE_HOOK_SOURCE || "";
    const content = `jcode session started (${short}) cwd=${CWD || "?"}${src ? ` source=${src}` : ""}`;
    await Promise.allSettled([
      fact("jcode session started", content, ["jcode", "session", "session-start"]),
      observe("jcode-session", content),
    ]);
  } else if (EVENT === "session_end") {
    const src = process.env.JCODE_HOOK_SOURCE || "";
    const content = `jcode session ended (${short}) cwd=${CWD || "?"}${src ? ` source=${src}` : ""}`;
    await Promise.allSettled([
      fact("jcode session ended", content, ["jcode", "session", "session-end"]),
      observe("jcode-session", content),
    ]);
  } else if (EVENT === "turn_start") {
    // Cheap turn-open marker: model + source only. The heavy recall path is
    // the FTS query the agent itself runs at turn start (see hypernexus skill).
    const model = process.env.JCODE_HOOK_MODEL || "?";
    const src = process.env.JCODE_HOOK_SOURCE || "";
    await fact(
      "jcode turn started",
      `jcode turn started (${short}) model=${model}${src ? ` source=${src}` : ""}`,
      ["jcode", "turn", "turn-start"],
    );
  } else if (EVENT === "turn_end") {
    const status = process.env.JCODE_HOOK_STATUS || "ok";
    const dur = process.env.JCODE_HOOK_DURATION_MS || "?";
    const model = process.env.JCODE_HOOK_MODEL || "?";
    const last = (process.env.JCODE_HOOK_LAST_ASSISTANT_TEXT || "").slice(0, 500);
    const err = process.env.JCODE_HOOK_ERROR || "";
    const content = `jcode turn ${status} (${short}) model=${model} durationMs=${dur}${tokens()}${err ? ` error=${err.slice(0, 300)}` : ""}${last ? ` last=${last}` : ""}`;
    await fact("jcode turn ended", content, ["jcode", "turn", status]);
  } else if (EVENT === "post_tool") {
    const err = process.env.JCODE_HOOK_ERROR || "";
    const status = process.env.JCODE_HOOK_STATUS || "";
    const tool = process.env.JCODE_HOOK_TOOL_NAME || "?";
    const callId = process.env.JCODE_HOOK_TOOL_CALL_ID || "";
    const touched = (process.env.JCODE_HOOK_TOUCHED_PATHS || "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);
    const dur = process.env.JCODE_HOOK_DURATION_MS || "";
    const outBytes = process.env.JCODE_HOOK_OUTPUT_BYTES || "";
    if (err || (status && status !== "ok" && status !== "success")) {
      await fact(
        "jcode tool error",
        `jcode tool failed (${short}) tool=${tool} status=${status || "?"} error=${err.slice(0, 500)}${callId ? ` call=${callId}` : ""}`,
        ["jcode", "tool", "tool-error"],
      );
    }
    // Touched-path observations enrich the kernel knowledge graph with
    // filesRead/filesModified even on success (bounded, fire-and-forget).
    if (touched.length) {
      await observe(
        "jcode-tool",
        `jcode ${tool} touched ${touched.length} path(s) (${short})${dur ? ` durationMs=${dur}` : ""}${outBytes ? ` outBytes=${outBytes}` : ""}`,
        [],
      ).catch(() => false);
    }
  }
  // Any other event: observe nothing, still allow.
}

try {
  await main();
} catch {
  /* observers must never fail the turn */
}
process.stdout.write('{"continue":true}\n');
process.exit(0);
