#!/usr/bin/env node
/*
 * hn-hook-lib.mjs — shared HyperNexus hook runtime (Node, no bash dependency).
 * Droid hooks run shell commands; on Windows there is no guaranteed bash, so
 * every hook here is `node ${DROID_PLUGIN_ROOT}/hooks/<name>.mjs`.
 * Contract: read hook JSON on stdin, budgeted kernel fetch (never throws),
 * fire-and-forget writes, JSON hookSpecificOutput on stdout for context events.
 */
import { spawn } from "node:child_process";

export const BASE = (process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778").replace(/\/+$/, "");
export const FAST_MS = 3000;

export async function readStdin() {
  let s = "";
  for await (const c of process.stdin) s += c;
  try { return JSON.parse(s || "{}"); } catch { return {}; }
}

export async function kfetch(path, { method = "GET", body, timeout = FAST_MS } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(`${BASE}${path}`, {
      method, signal: ctl.signal,
      headers: { "Content-Type": "application/json", "X-HyperNexus-Client": "droid-plugin/1.2.0" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    let data = null; try { data = JSON.parse(text); } catch { data = text; }
    return { ok: r.ok, status: r.status, data };
  } catch { return { ok: false, status: 0, data: null }; }
  finally { clearTimeout(t); }
}

/** Fire-and-forget POST: never awaits, never throws. */
export function postLater(path, body) {
  try {
    const child = spawn(process.execPath, ["-e", `
      fetch(${JSON.stringify(BASE + path)}, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: ${JSON.stringify(JSON.stringify(body))},
        signal: AbortSignal.timeout(3000),
      }).catch(()=>{});
    `], { stdio: "ignore", detached: true });
    child.unref?.();
  } catch { /* never throw */ }
}

export function outputContext(event, text) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: String(text).slice(0, 2000) },
  }) + "\n");
}
