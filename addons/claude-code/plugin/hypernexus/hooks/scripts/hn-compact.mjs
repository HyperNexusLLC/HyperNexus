#!/usr/bin/env node
/**
 * hn-compact.mjs — HyperNexus PreCompact hook for Claude Code.
 *
 * Persists a compaction pointer to L2 BEFORE the transcript is compacted so
 * the resumed session can pick up: latest goal (scratchpad) + a compacting
 * marker memory (tags: session,compact). Fire-and-forget, budgeted, never
 * throws, always exits 0. Never reads credentials.
 */
import { readFileSync } from "node:fs";

const BASE = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";
const BUDGET_MS = 3000;

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
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
  const sessionId = input.session_id || input.sessionId || "";
  const content =
    "Transcript compacting: active goal is in scratchpad key `goal`; " +
    "latest summary tagged session,summary holds the resume point." +
    (sessionId ? ` (session ${String(sessionId).slice(0, 24)})` : "");
  await post("/api/memory/facts/add", {
    title: "claude-code:pre-compact",
    content,
    tags: ["client:claude-code", "hook:pre-compact", "session", "compact"],
    namespace: "project",
  });
}

await main();
process.exit(0);
