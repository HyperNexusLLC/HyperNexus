#!/usr/bin/env node
/**
 * HyperNexus OpenCode Plugin Ã¢â‚¬â€ V2 native + V1 compatible
 * =======================================================
 *
 * Full bridge: OpenCode Ã¢â€ â€ HyperNexus kernel (default http://127.0.0.1:7778).
 *
 * Surfaces
 * --------
 *  - 36 typed tools (namespace `hypernexus`) bound to kernel APIs
 *  - 11 slash commands (/hn-*)
 *  - 3 registered skills (memory discipline, ops, workflows)
 *  - Session hooks: prompt admission (@memory:key expansion + suggestion feed),
 *    context injection (fast FTS harvest + status + proactive tool suggestions),
 *    compaction enrichment, title/model-request telemetry, retry observability
 *  - Tool hooks: RBAC pre-check + fire-and-forget audit + auto-store of results
 *  - Permission hook: kernel-aware RBAC evaluation (audit/ask/deny modes)
 *  - Shell hook: HYPERNEXUS_* env injection into spawned shells
 *  - MCP: auto-registers the kernel's stdio MCP server (`hypernexus mcp`)
 *  - Worktree: HyperNexus-managed local worktree strategy
 *  - Event stream: turn-end observation (fire-and-forget)
 *
 * Contract (see addons/shared/hypernexus.manifest.json)
 * -----------------------------------------------------
 *  - Every kernel call is budgeted (AbortSignal.timeout) and NEVER throws.
 *  - Hot-path hooks use FTS-only search (Ã¢â€°Â¤400ms). Never vector search on a turn path.
 *  - Per-event side effects are fire-and-forget.
 *  - Response shapes are normalized here so callers never see kernel shape drift.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Identity & budgets Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export const PLUGIN_ID = "hypernexus";
export const PLUGIN_VERSION = "1.2.0";

const DEFAULT_BASE = (process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778").replace(/\/+$/, "");
/** Active kernel base Ã¢â‚¬â€ updated by setup()/server() so tool executors honor options.baseUrl. */
let RUNTIME_BASE = DEFAULT_BASE;

const HOOK_BUDGET = Number(process.env.HYPERNEXUS_HOOK_BUDGET_MS || 400); // hot-path hooks
const FAST_BUDGET = Number(process.env.HYPERNEXUS_FAST_BUDGET_MS || 2500); // status/search
const SLOW_BUDGET = Number(process.env.HYPERNEXUS_SLOW_BUDGET_MS || 8000); // vector search / writes
const CALL_BUDGET = Number(process.env.HYPERNEXUS_CALL_BUDGET_MS || 12000); // routed MCP calls

const SYS_TTL = 15_000;
const MEM_TTL = 30_000;
const SUG_TTL = 60_000;
const MAX_STORE_CHARS = 4000;
const MAX_SYSTEM_BLOCK = 1400; // chars of injected context per turn

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Small utilities Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function clamp(text, n) {
  const s = String(text ?? "");
  return s.length > n ? `${s.slice(0, n)}Ã¢â‚¬Â¦` : s;
}

function isAbort(err) {
  return !!err && (err.name === "AbortError" || err.name === "TimeoutError" || /abort|timeout/i.test(String(err.message || err)));
}

function tryJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Kernel client (budgeted, never throws) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/**
 * @returns {Promise<{ok:boolean, status:number, data:any, error?:string, ms:number}>}
 */
async function kernel(endpoint, { method = "GET", body, budget = FAST_BUDGET, signal, base } = {}) {
  const url = `${base || RUNTIME_BASE}${endpoint}`;
  const started = Date.now();
  const timeout = AbortSignal.timeout(Math.max(50, budget));
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const res = await fetch(url, {
      method,
      signal: combined,
      headers: {
        "Content-Type": "application/json",
        "X-HyperNexus-Client": `opencode/${PLUGIN_VERSION}`,
        ...(process.env.HYPERNEXUS_DASHBOARD_TOKEN
          ? { Authorization: `Bearer ${process.env.HYPERNEXUS_DASHBOARD_TOKEN}` }
          : {}),
      },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await res.text();
    const data = tryJson(text) ?? text;
    return {
      ok: res.ok,
      status: res.status,
      data,
      ms: Date.now() - started,
      ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      ms: Date.now() - started,
      error: isAbort(err) ? `timeout after ${budget}ms` : String(err?.message || err),
    };
  }
}

/** Unwrap the kernel envelope: {data:{data:Ã¢â‚¬Â¦}} / {data:Ã¢â‚¬Â¦} / raw Ã¢â€ â€™ payload. */
function unwrap(res) {
  let d = res?.data;
  if (d && typeof d === "object" && !Array.isArray(d) && "data" in d) d = d.data;
  return d ?? null;
}

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    for (const key of ["results", "items", "memories", "tools", "records", "data", "servers", "skills", "chain", "edges", "nodes"]) {
      if (Array.isArray(payload[key])) return payload[key];
    }
  }
  return [];
}

/** fts-search wraps rows as {record:{Ã¢â‚¬Â¦}} Ã¢â‚¬â€ normalize at the adapter boundary. */
function recOf(x) {
  return x && typeof x === "object" && x.record && typeof x.record === "object" ? x.record : x;
}

/** /api/memory/list returns memories as JSON strings. */
function parseMaybeJson(v) {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return v;
  return tryJson(t) ?? v;
}

function memContent(m) {
  const r = recOf(parseMaybeJson(m)) || {};
  return String(r.content ?? r.text ?? r.summary ?? (typeof r === "string" ? r : "") ?? "").trim();
}

function memTags(m) {
  const r = recOf(parseMaybeJson(m)) || {};
  const t = r.tags ?? r.metadata?.tags;
  if (Array.isArray(t)) return t.map(String);
  if (typeof t === "string") return t.split(/[,\s]+/).filter(Boolean);
  return [];
}

function fmtMemory(m, max = 220) {
  const r = recOf(parseMaybeJson(m)) || {};
  const id = String(r.id ?? r.memory_id ?? "").trim();
  const content = memContent(m);
  const tags = memTags(m);
  return `- ${id ? `[${id}] ` : ""}${clamp(content.replace(/\s+/g, " "), max)}${tags.length ? ` [${tags.slice(0, 4).join(", ")}]` : ""}`;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Caches & fire-and-forget infrastructure Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const caches = {
  status: { at: 0, value: null },
  suggestions: { at: 0, value: null },
  mem: new Map(), // query-hash Ã¢â€ â€™ {at, value}
  fedAt: new Map(), // session Ã¢â€ â€™ ts of last suggestion feed
  booted: new Set(), // sessions already primed
};

function cacheGet(cache, key, ttl) {
  const hit = key ? cache.get?.(key) : cache;
  if (!hit || Date.now() - hit.at > ttl) return null;
  return hit.value;
}

function cacheSet(cache, key, value) {
  if (key) cache.set?.(key, { at: Date.now(), value });
  else cache.value = value, (cache.at = Date.now());
}

// Batched observation/audit queue Ã¢â€ â€™ kernel (fire-and-forget, never on turn path)
const auditQueue = [];
let auditTimer = null;

function audit(entry) {
  try {
    auditQueue.push({
      type: entry.type || "decision",
      content: clamp(String(entry.content ?? ""), 600),
      title: clamp(String(entry.title ?? entry.action ?? "opencode-event"), 160),
      narrative: clamp(String(entry.narrative ?? entry.content ?? ""), 600),
      toolName: String(entry.toolName ?? "opencode").slice(0, 64),
      concepts: Array.isArray(entry.concepts) ? entry.concepts.slice(0, 8).map((c) => String(c).slice(0, 48)) : [],
      filesRead: Array.isArray(entry.filesRead) ? entry.filesRead.slice(0, 10).map((f) => String(f).slice(0, 200)) : [],
      filesModified: Array.isArray(entry.filesModified) ? entry.filesModified.slice(0, 10).map((f) => String(f).slice(0, 200)) : [],
      metadata: {
        source: "opencode-plugin",
        client: "opencode",
        ...(entry.metadata || {}),
      },
    });
    if (auditQueue.length > 60) auditQueue.splice(0, auditQueue.length - 60);
    if (!auditTimer) {
      auditTimer = setTimeout(() => {
        auditTimer = null;
        void flushAudit();
      }, 4000);
      auditTimer.unref?.();
    }
  } catch {
    /* never throw */
  }
}

async function flushAudit() {
  const batch = auditQueue.splice(0, 40);
  if (batch.length === 0) return;
  // Coalesce the batch into ONE observation record: the store rewrites its whole
  // file per write, so N events must cost 1 write, not N.
  const filesModified = [...new Set(batch.flatMap((e) => e.filesModified || []))].slice(0, 20);
  const filesRead = [...new Set(batch.flatMap((e) => e.filesRead || []))].slice(0, 20);
  const types = [...new Set(batch.map((e) => e.type))];
  const combined = {
    type: types.length === 1 ? types[0] : "progress",
    title: `opencode-activity:${batch.length} events`,
    content: batch.map((e) => `${e.title}: ${e.content}`).join("\n").slice(0, 2000),
    narrative: clamp(`OpenCode plugin batched ${batch.length} events (${types.join("/")}).`, 600),
    toolName: "opencode.batch",
    concepts: ["opencode-activity"],
    filesRead,
    filesModified,
    metadata: {
      source: "opencode-plugin",
      client: "opencode",
      batch: batch.slice(0, 40).map((e) => ({ t: e.title, c: clamp(e.content, 120), ty: e.type, tm: e.toolName })),
    },
  };
  const r = await kernel("/api/memory/observations/record", {
    method: "POST",
    body: combined,
    budget: FAST_BUDGET,
  });
  if (!r.ok) {
    // Fallback: facts/add keeps the trail even when observations are unavailable.
    await kernel("/api/memory/facts/add", {
      method: "POST",
      body: {
        content: combined.content || combined.title,
        title: combined.title,
        tags: ["client:opencode", "tool:opencode.batch", combined.type],
        namespace: "project",
      },
      budget: FAST_BUDGET,
    });
  }
  if (auditQueue.length > 0 && !auditTimer) {
    auditTimer = setTimeout(() => {
      auditTimer = null;
      void flushAudit();
    }, 4000);
    auditTimer.unref?.();
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Fast-context features (hot path) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/** True while the kernel is known-down (negative cache) Ã¢â‚¬â€ skips hot-path fetches. */
function kernelKnownDown() {
  const st = caches.status.value;
  return !!st && st.ok === false && Date.now() - caches.status.at < SYS_TTL;
}

/** Expand @memory:key references with fast FTS context. Offset-safe. */
async function expandMemoryRefs(text, deadline, prompt) {
  if (!text || !/@memory:/.test(text)) return text;
  const re = /@memory:([\w.:-]+)/g;
  const edits = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const key = match[1];
    if (Date.now() > deadline) break; // budget exhausted: leave remaining refs intact
    const left = Math.max(80, deadline - Date.now());
    const res = await kernel(`/api/memory/fts-search?q=${encodeURIComponent(key)}&limit=2`, {
      budget: Math.min(HOOK_BUDGET, left),
    });
    const rows = asList(unwrap(res)).slice(0, 2).map(recOf);
    if (rows.length === 0) continue;
    const ctx = rows.map((r) => `  - ${clamp(memContent(r).replace(/\s+/g, " "), 200)}`).join("\n");
    edits.push({
      start: match.index,
      end: match.index + match[0].length,
      replacement: `[HyperNexus memory: ${key}]\n${ctx}`,
    });
  }
  return applyEdits(text, edits, prompt);
}

/** Apply non-overlapping edits right-to-left and repair attachment mention offsets. */
function applyEdits(text, edits, prompt) {
  if (!edits.length) return text;
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = text;
  for (const e of sorted) {
    if (e.start < 0 || e.end > out.length || e.start >= e.end) continue;
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  if (prompt?.files?.length) {
    for (const file of prompt.files) {
      const m = file?.mention;
      if (!m || typeof m !== "object") continue;
      const start = Number(m.start ?? m.from ?? -1);
      const end = Number(m.end ?? m.to ?? -1);
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      let delta = 0;
      let overlap = false;
      for (const e of edits) {
        if (e.end <= start) delta += e.replacement.length - (e.end - e.start);
        else if (e.start < end) overlap = true;
      }
      if (overlap) {
        delete file.mention; // mention no longer maps to the rewritten text
      } else {
        if ("start" in m) m.start = start + delta;
        if ("from" in m) m.from = start + delta;
        if ("end" in m) m.end = end + delta;
        if ("to" in m) m.to = end + delta;
      }
    }
  }
  return out;
}

/** Hot-path harvest: FTS only, capped by the shared deadline. */
async function harvestFast(text, deadline, limit = 3) {
  if (kernelKnownDown()) return [];
  const query = clamp(String(text || "").replace(/\s+/g, " ").trim(), 120);
  if (query.length < 8) return [];
  const key = hash(query.toLowerCase());
  const cached = cacheGet(caches.mem, key, MEM_TTL);
  if (cached) return cached;
  const res = await kernel(`/api/memory/fts-search?q=${encodeURIComponent(query)}&limit=${limit}`, {
    budget: Math.min(HOOK_BUDGET, Math.max(80, deadline - Date.now())),
  });
  const rows = asList(unwrap(res)).slice(0, limit).map(recOf);
  cacheSet(caches.mem, key, rows);
  return rows;
}

/** Fire-and-forget feed of conversation turns to the preemptive advertiser. */
function feedSuggestions(role, content) {
  const text = clamp(String(content || ""), 500);
  if (text.length < 12) return;
  void kernel("/api/mcp/tool-suggestions", {
    method: "POST",
    body: { role, content: text },
    budget: FAST_BUDGET,
  });
}

async function getSuggestions() {
  if (kernelKnownDown()) return [];
  const cached = cacheGet(caches.suggestions, null, SUG_TTL);
  if (cached) return cached;
  const res = await kernel("/api/mcp/tool-suggestions", { budget: FAST_BUDGET });
  const payload = unwrap(res);
  const list = asList(payload);
  cacheSet(caches.suggestions, null, list);
  return list;
}

async function getStatus() {
  const cached = cacheGet(caches.status, null, SYS_TTL);
  if (cached) return cached;
  const [health, mcp, runtime] = await Promise.all([
    kernel("/health", { budget: FAST_BUDGET }),
    kernel("/api/mcp/status", { budget: FAST_BUDGET }),
    kernel("/api/runtime/status", { budget: FAST_BUDGET }),
  ]);
  const value = {
    ok: !!health.ok,
    version: health.data?.version ?? "unknown",
    uptimeSec: health.data?.uptimeSec ?? null,
    mcp: {
      connected: !!unwrap(mcp)?.connected,
      connectedCount: unwrap(mcp)?.connectedCount ?? 0,
    },
    tools: unwrap(runtime)?.cli?.toolCount ?? null,
    providers: unwrap(runtime)?.providers ?? null,
  };
  cacheSet(caches.status, null, value);
  return value;
}

/** Build the compact per-turn system block (Ã¢â€°Â¤ MAX_SYSTEM_BLOCK chars). */
async function buildSystemBlock(lastUserText) {
  const deadline = Date.now() + HOOK_BUDGET;
  const parts = [];
  try {
    const st = await getStatus();
    if (st.ok) {
      parts.push(
        `HyperNexus kernel v${st.version} online Ã¢â‚¬â€ ${st.mcp.connectedCount} MCP servers connected` +
          (st.tools ? `, ${st.tools} tools` : "") +
          `. Tools: hypernexus_memory_search, hypernexus_tool_search, hypernexus_context_harvest, hypernexus_suggest_tools.`
      );
    } else {
      parts.push("HyperNexus kernel is offline Ã¢â‚¬â€ hypernexus_* tools will report degraded status; rely on local tools.");
    }
    const [memories, suggestions] = await Promise.all([
      harvestFast(lastUserText, deadline, 3),
      getSuggestions(),
    ]);
    if (memories.length) {
      parts.push("Relevant L2 memory (recall before re-deriving):\n" + memories.map((m) => fmtMemory(m)).join("\n"));
    }
    if (suggestions.length) {
      const lines = suggestions.slice(0, 3).map((s) => {
        const name = String(s?.name ?? s?.tool ?? s?.id ?? "").slice(0, 48);
        const why = clamp(String(s?.reason ?? s?.description ?? s?.summary ?? ""), 90);
        return `- ${name}${why ? ` Ã¢â‚¬â€ ${why}` : ""}`;
      });
      if (lines.length) parts.push("Suggested tools for this conversation:\n" + lines.join("\n"));
    }
  } catch {
    /* never throw */
  }
  return clamp(parts.join("\n\n"), MAX_SYSTEM_BLOCK);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Result persistence Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const storedHashes = new Set(); // skip storing identical results twice

function autoStoreResult(toolName, input, text) {
  const content = String(text ?? "");
  if (content.length < 400) return; // only substantial results are worth persisting
  const h = hash(`${toolName}:${content}`);
  if (storedHashes.has(h)) return; // dedupe repeated outputs
  storedHashes.add(h);
  if (storedHashes.size > 200) storedHashes.clear();
  audit({
    type: "progress",
    title: `tool-result:${toolName}`,
    content,
    toolName,
    narrative: clamp(`Tool ${toolName} produced a substantial result.`, 300),
    metadata: { autoStore: true },
  });
  void kernel("/api/memory/facts/add", {
    method: "POST",
    body: {
      title: `tool-result:${toolName}`,
      content: clamp(content, MAX_STORE_CHARS),
      tags: ["client:opencode", "tool-result", `tool:${clamp(String(toolName), 40)}`],
      namespace: "project",
    },
    budget: FAST_BUDGET,
  });
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ File-change observation capture Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const FILE_WRITE_TOOLS = new Set(["edit", "multiedit", "write", "apply_search_replace", "notebookedit"]);
const FILE_READ_TOOLS = new Set(["read", "grep", "glob", "ls", "list", "codebase_search"]);

function fileRefs(input) {
  const refs = [];
  for (const key of ["path", "file_path", "filePath", "notebook_path", "target", "dest", "destination"]) {
    const v = input?.[key];
    if (typeof v === "string" && v.length > 1) refs.push(v);
    if (Array.isArray(v)) for (const p of v) if (typeof p === "string") refs.push(p);
  }
  return [...new Set(refs)].slice(0, 10);
}

/** Record a structured file observation for the knowledge graph. Returns true when captured. */
function captureFileObservation(toolName, input) {
  const name = String(toolName || "").toLowerCase();
  const refs = fileRefs(input);
  if (!refs.length) return false;
  if (FILE_WRITE_TOOLS.has(name)) {
    audit({
      type: "progress",
      title: `file-change:${name}`,
      content: `${name} modified ${refs.join(", ")}`,
      narrative: `Tool ${toolName} modified ${refs.length} file(s) via the OpenCode session.`,
      toolName: String(toolName),
      filesModified: refs,
      concepts: ["file-change"],
      metadata: { kind: "file-change" },
    });
    return true;
  }
  if (FILE_READ_TOOLS.has(name)) {
    audit({
      type: "discovery",
      title: `file-read:${name}`,
      content: `${name} read ${refs.join(", ")}`,
      narrative: `Tool ${toolName} read ${refs.length} file(s) via the OpenCode session.`,
      toolName: String(toolName),
      filesRead: refs,
      concepts: ["file-read"],
      metadata: { kind: "file-read" },
    });
    return true;
  }
  return false;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ RBAC policy Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const DANGEROUS = [
  /\brm\s+-[a-z]*r/i,
  /\bmkfs\b/i,
  /\bdrop\s+(table|database)\b/i,
  /\btruncate\s+table\b/i,
  /\bgit\s+push\s+.*--force\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bformat\s+[a-z]:/i,
  /\bdel\s+\/[sf]\b/i,
  /\bRemove-Item\b.*-[rR]ecurse/i,
  /\bshutdown\b|\breboot\b/i,
  /\bDROP\s+SCHEMA\b/i,
];

function dangerousMatch(text) {
  const s = String(text ?? "");
  for (const re of DANGEROUS) if (re.test(s)) return re.source;
  return null;
}

function opencodeSkillsFallback(root, id) {
  return path.join(root, id, "SKILL.md");
}

function rbacMode() {
  const m = String(process.env.HYPERNEXUS_RBAC || "audit").toLowerCase();
  return m === "ask" || m === "deny" ? m : "audit";
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Tools Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const str = (description) => ({ type: "string", description });
const int = (description, def) => ({ type: "number", description: `${description} (default ${def})` });

const TOOLS = [
  {
    name: "status",
    description:
      "HyperNexus kernel health, version, uptime, and MCP bridge status. Call first when the kernel may be offline.",
    input: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const st = await getStatus();
      const runtime = await kernel("/api/runtime/status", { budget: FAST_BUDGET });
      return {
        content: JSON.stringify({ status: st, runtime: unwrap(runtime) ?? runtime.error }, null, 2),
        metadata: { kernelOk: st.ok },
      };
    },
  },
  {
    name: "system_overview",
    description: "Full system overview: kernel health, MCP inventory, providers, memory tiers, mesh.",
    input: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const res = await kernel("/api/system/overview", { budget: FAST_BUDGET });
      return { content: JSON.stringify(unwrap(res) ?? res.error, null, 2) };
    },
  },
  {
    name: "memory_store",
    description: "Persist a fact, decision, or gotcha to HyperNexus L2 memory with tags (survives across sessions/tools).",
    input: {
      type: "object",
      properties: {
        content: str("The memory content (markdown/plain text)."),
        title: str("Optional short title."),
        tags: { type: "array", items: str("tag"), description: "Tags, e.g. ['deployment','bug-fix']." },
        namespace: str("Namespace: project | global | user (default project)."),
      },
      required: ["content"],
      additionalProperties: false,
    },
    async run({ content, title, tags, namespace }) {
      const res = await kernel("/api/memory/facts/add", {
        method: "POST",
        body: {
          content: String(content),
          title: title ? String(title) : undefined,
          tags: Array.isArray(tags) ? tags.map(String) : [],
          namespace: namespace ? String(namespace) : "project",
          metadata: { source: "opencode-plugin", client: "opencode" },
        },
        budget: SLOW_BUDGET,
      });
      if (!res.ok) return { content: `[hypernexus] memory_store failed: ${res.error}`, metadata: { ok: false } };
      const payload = unwrap(res) ?? {};
      const id = payload?.memory?.id ?? payload?.id ?? payload?.record?.id ?? null;
      return { content: "Stored to HyperNexus L2 memory.", metadata: { ok: true, id } };
    },
  },
  {
    name: "memory_search",
    description: "Keyword + semantic search across L2 memory (slower, best relevance). Use for explicit lookups before re-deriving known answers; for hot loops use memory_fts_search instead.",
    input: {
      type: "object",
      properties: {
        query: str("Search query."),
        limit: int("Max results", 8),
      },
      required: ["query"],
      additionalProperties: false,
    },
    async run({ query, limit }) {
      const res = await kernel(
        `/api/memory/search?query=${encodeURIComponent(String(query))}&limit=${Math.min(20, Number(limit) || 8)}`,
        { budget: SLOW_BUDGET }
      );
      const rows = asList(unwrap(res));
      if (!rows.length) return { content: "No memories matched." };
      return { content: rows.map((m) => fmtMemory(m, 300)).join("\n"), metadata: { count: rows.length } };
    },
  },
  {
    name: "memory_fts_search",
    description: "FAST keyword search across L2 memory (FTS). Prefer this in latency-sensitive loops.",
    input: {
      type: "object",
      properties: { query: str("Search query."), limit: int("Max results", 8) },
      required: ["query"],
      additionalProperties: false,
    },
    async run({ query, limit }) {
      const res = await kernel(
        `/api/memory/fts-search?q=${encodeURIComponent(String(query))}&limit=${Math.min(20, Number(limit) || 8)}`,
        { budget: FAST_BUDGET }
      );
      const rows = asList(unwrap(res)).map(recOf);
      if (!rows.length) return { content: "No memories matched." };
      return { content: rows.map((m) => fmtMemory(m, 300)).join("\n"), metadata: { count: rows.length } };
    },
  },
  {
    name: "memory_vector_search",
    description: "Semantic vector search over L2 plus cold-archive (L3) fallback for older knowledge. Use when keywords are unknown or paraphrased â€” slower than memory_search due to embedding warm-up.",
    input: {
      type: "object",
      properties: { query: str("Natural-language query."), limit: int("Max results", 6), cold: { type: "boolean", description: "Also search L3 cold archive (default true)." } },
      required: ["query"],
      additionalProperties: false,
    },
    async run({ query, limit, cold }) {
      const q = encodeURIComponent(String(query));
      const [warm, coldRes] = await Promise.all([
        kernel(`/api/memory/search?query=${q}&limit=${Math.min(20, Number(limit) || 6)}`, { budget: SLOW_BUDGET }),
        cold === false
          ? Promise.resolve({ ok: false, data: null, error: "skipped" })
          : kernel(`/api/memory/cold-archive/search?query=${q}&limit=3`, { budget: SLOW_BUDGET }),
      ]);
      const rows = asList(unwrap(warm));
      const old = asList(unwrap(coldRes));
      const out = [
        ...rows.map((m) => fmtMemory(m, 300)),
        ...old.map((m) => fmtMemory(m, 300).replace(/^- /, "- [archived] ")),
      ];
      return {
        content: out.length ? out.join("\n") : "No memories matched.",
        metadata: { l2: rows.length, l3: old.length },
      };
    },
  },
  {
    name: "memory_list",
    description: "Browse the most recent L2 memories (JSON-string rows are normalized).",
    input: {
      type: "object",
      properties: { limit: int("How many recent memories", 10) },
      additionalProperties: false,
    },
    async run({ limit }) {
      const res = await kernel(`/api/memory/list?limit=${Math.min(50, Number(limit) || 10)}`, { budget: FAST_BUDGET });
      const rows = asList(unwrap(res)).map(parseMaybeJson);
      if (!rows.length) return { content: "Memory vault is empty." };
      return { content: rows.map((m) => fmtMemory(m, 260)).join("\n"), metadata: { count: rows.length } };
    },
  },
  {
    name: "scratchpad",
    description: "Read/write the L1 scratchpad Ã¢â‚¬â€ short-lived working state shared across harnesses.",
    input: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["get", "set", "append"], description: "Operation." },
        key: str("Scratchpad key, e.g. 'current_task'."),
        value: str("Value for set/append."),
      },
      required: ["action", "key"],
      additionalProperties: false,
    },
    async run({ action, key, value }) {
      if (action === "set" || action === "append") {
        let merged = value ?? "";
        if (action === "append") {
          const cur = await kernel(`/api/memory/scratchpad/get?key=${encodeURIComponent(String(key))}`, { budget: FAST_BUDGET });
          const pad = unwrap(cur) ?? {};
          const existing = typeof pad?.[key] === "string" ? pad[key] : pad?.scratchpad?.[key] ?? pad?.value ?? "";
          merged = existing ? `${existing}\n${value ?? ""}` : String(value ?? "");
        }
        const res = await kernel("/api/memory/scratchpad/set", {
          method: "POST",
          body: { key: String(key), value: String(merged) },
          budget: FAST_BUDGET,
        });
        return {
          content: res.ok ? `Scratchpad[${key}] set.` : `[hypernexus] scratchpad set failed: ${res.error}`,
          metadata: { ok: res.ok },
        };
      }
      const res = await kernel(`/api/memory/scratchpad/get?key=${encodeURIComponent(String(key))}`, { budget: FAST_BUDGET });
      const pad = unwrap(res) ?? {};
      const value2 = pad?.[key] ?? pad?.scratchpad?.[key] ?? pad ?? res.error;
      return { content: typeof value2 === "string" ? value2 : JSON.stringify(value2, null, 2) };
    },
  },
  {
    name: "context_harvest",
    description: "Harvest prior context for a task: memories, session summaries, and observations (start complex tasks with this).",
    input: {
      type: "object",
      properties: { topic: str("Task topic or description."), limit: int("Max items per source", 5) },
      required: ["topic"],
      additionalProperties: false,
    },
    async run({ topic, limit }) {
      const q = encodeURIComponent(clamp(String(topic), 200));
      const n = Math.min(10, Number(limit) || 5);
      const [mem, sums, obs] = await Promise.all([
        kernel(`/api/memory/search?query=${q}&limit=${n}`, { budget: SLOW_BUDGET }),
        kernel(`/api/memory/session-summaries/search?query=${q}&limit=${n}`, { budget: SLOW_BUDGET }),
        kernel(`/api/memory/observations/search?query=${q}&limit=${n}`, { budget: SLOW_BUDGET }),
      ]);
      const sections = [
        ["L2 memories", asList(unwrap(mem))],
        ["Session summaries", asList(unwrap(sums))],
        ["Observations", asList(unwrap(obs))],
      ];
      const out = sections
        .filter(([, rows]) => rows.length)
        .map(([label, rows]) => `## ${label}\n${rows.slice(0, n).map((m) => fmtMemory(m, 280)).join("\n")}`);
      return {
        content: out.length ? out.join("\n\n") : "No prior context found for this topic.",
        metadata: { sources: sections.map(([l, r]) => `${l}:${r.length}`) },
      };
    },
  },
  {
    name: "record_observation",
    description: "Record a structured observation (discovery|decision|progress|warning|fix) with concepts and touched files.",
    input: {
      type: "object",
      properties: {
        content: str("Observation content."),
        type: { type: "string", enum: ["discovery", "decision", "progress", "warning", "fix"], description: "Observation type." },
        title: str("Short title."),
        concepts: { type: "array", items: str("concept"), description: "Concepts this relates to." },
        filesRead: { type: "array", items: str("path"), description: "Files read." },
        filesModified: { type: "array", items: str("path"), description: "Files modified." },
      },
      required: ["content"],
      additionalProperties: false,
    },
    async run(input) {
      const res = await kernel("/api/memory/observations/record", {
        method: "POST",
        body: {
          content: String(input.content),
          type: input.type ? String(input.type) : "discovery",
          title: input.title ? String(input.title) : undefined,
          concepts: Array.isArray(input.concepts) ? input.concepts.map(String) : [],
          filesRead: Array.isArray(input.filesRead) ? input.filesRead.map(String) : [],
          filesModified: Array.isArray(input.filesModified) ? input.filesModified.map(String) : [],
          toolName: "opencode.record_observation",
          metadata: { source: "opencode-plugin", client: "opencode" },
        },
        budget: FAST_BUDGET,
      });
      return {
        content: res.ok ? "Observation recorded." : `[hypernexus] record_observation failed: ${res.error}`,
        metadata: { ok: res.ok },
      };
    },
  },
  {
    name: "tool_search",
    description: "Semantic discovery across the 26k+ MCP tool catalog. Describe what you need; get the best matching tools.",
    input: {
      type: "object",
      properties: { query: str("What you need to do, e.g. 'browser automation'."), limit: int("Max results", 10) },
      required: ["query"],
      additionalProperties: false,
    },
    async run({ query, limit }) {
      const res = await kernel(
        `/api/tools/search?query=${encodeURIComponent(String(query))}&limit=${Math.min(25, Number(limit) || 10)}`,
        { budget: FAST_BUDGET }
      );
      const rows = asList(unwrap(res));
      if (!rows.length) return { content: "No tools matched." };
      return {
        content: rows
          .map((t) => {
            const r = recOf(t) || {};
            const name = String(r.name ?? r.id ?? r.tool ?? "?");
            const server = r.server ? ` (${r.server})` : "";
            return `- ${name}${server}: ${clamp(String(r.description ?? ""), 160)}`;
          })
          .join("\n"),
        metadata: { count: rows.length },
      };
    },
  },
  {
    name: "tool_discover",
    description: "Query the native MCP router (L1+L2+L3 layers) for tools, returning the working set it would auto-load.",
    input: {
      type: "object",
      properties: { query: str("Capability you are looking for."), limit: int("Max results", 10) },
      required: ["query"],
      additionalProperties: false,
    },
    async run({ query, limit }) {
      const res = await kernel(
        `/api/mcp/native/search?query=${encodeURIComponent(clamp(String(query), 160))}&limit=${Math.min(25, Number(limit) || 10)}`,
        { budget: FAST_BUDGET }
      );
      return { content: JSON.stringify(unwrap(res) ?? res.error, null, 2) };
    },
  },
  {
    name: "suggest_tools",
    description: "Read proactive tool suggestions the preemptive advertiser derived from this conversation.",
    input: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const list = await getSuggestions();
      if (!list.length) return { content: "No suggestions yet Ã¢â‚¬â€ they appear as the conversation progresses." };
      return {
        content: list
          .slice(0, 10)
          .map((s) => `- ${s?.name ?? s?.tool ?? s?.id ?? "?"}: ${clamp(String(s?.reason ?? s?.description ?? ""), 180)}`)
          .join("\n"),
        metadata: { count: list.length },
      };
    },
  },
  {
    name: "mcp_status",
    description: "MCP bridge status: connected servers, counts, and initialization state.",
    input: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const res = await kernel("/api/mcp/status", { budget: FAST_BUDGET });
      return { content: JSON.stringify(unwrap(res) ?? res.error, null, 2) };
    },
  },
  {
    name: "mcp_servers",
    description: "List configured + runtime MCP servers with status and tool counts.",
    input: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const [runtime, configured] = await Promise.all([
        kernel("/api/mcp/servers", { budget: FAST_BUDGET }),
        kernel("/api/mcp/servers/configured", { budget: FAST_BUDGET }),
      ]);
      return {
        content: JSON.stringify({ runtime: unwrap(runtime), configured: unwrap(configured) }, null, 2),
      };
    },
  },
  {
    name: "mcp_tools",
    description: "List MCP tools currently exposed by the kernel bridge (with always-on flags).",
    input: {
      type: "object",
      properties: { limit: int("Max rows", 25) },
      additionalProperties: false,
    },
    async run({ limit }) {
      const res = await kernel("/api/mcp/tools", { budget: FAST_BUDGET });
      const rows = asList(unwrap(res)).slice(0, Math.min(100, Number(limit) || 25));
      return {
        content: rows
          .map((t) => {
            const r = recOf(t) || {};
            return `- ${String(r.name ?? r.id ?? "?")}: ${clamp(String(r.description ?? ""), 140)}`;
          })
          .join("\n") || "No MCP tools registered.",
        metadata: { count: rows.length },
      };
    },
  },
  {
    name: "mcp_search",
    description: "Search the live-synced MCP tool inventory (server-qualified tool names and schemas).",
    input: {
      type: "object",
      properties: { query: str("Search text."), limit: int("Max results", 10) },
      required: ["query"],
      additionalProperties: false,
    },
    async run({ query, limit }) {
      const res = await kernel(
        `/api/mcp/tools/search?query=${encodeURIComponent(String(query))}&limit=${Math.min(25, Number(limit) || 10)}`,
        { budget: FAST_BUDGET }
      );
      return { content: JSON.stringify(unwrap(res) ?? res.error, null, 2) };
    },
  },
  {
    name: "mcp_call",
    description: "Invoke a discovered MCP tool through the kernel router (server/tool name + args).",
    input: {
      type: "object",
      properties: {
        tool: str("Tool name, e.g. 'filesystem/read_file' or 'server_tool'."),
        args: { type: "object", description: "Tool arguments.", additionalProperties: true },
      },
      required: ["tool"],
      additionalProperties: false,
    },
    async run({ tool, args }) {
      const res = await kernel("/api/agent/tool", {
        method: "POST",
        body: { name: String(tool), args: args && typeof args === "object" ? args : {} },
        budget: CALL_BUDGET,
      });
      return {
        content: JSON.stringify(unwrap(res) ?? { error: res.error, raw: res.data }, null, 2),
        metadata: { ok: res.ok },
      };
    },
  },
  {
    name: "session_search",
    description: "Search imported coding sessions (Claude Code, Aider, Gemini, Ã¢â‚¬Â¦) for prior work and decisions.",
    input: {
      type: "object",
      properties: { query: str("Search text."), limit: int("Max results", 10) },
      required: ["query"],
      additionalProperties: false,
    },
    async run({ query, limit }) {
      const res = await kernel(`/api/sessions/imported/list?limit=50`, { budget: FAST_BUDGET });
      const rows = asList(unwrap(res));
      const needle = String(query).toLowerCase();
      const matched = rows.filter((s) => JSON.stringify(recOf(s)).toLowerCase().includes(needle)).slice(0, Math.min(25, Number(limit) || 10));
      if (!matched.length) return { content: "No imported sessions matched." };
      return {
        content: matched
          .map((s) => {
            const r = recOf(s) || {};
            const id = String(r.id ?? r.session_id ?? r.path ?? "?");
            const summary = r.summary ?? r.title ?? r.firstPrompt ?? "";
            return `- ${id}: ${clamp(String(summary).replace(/\s+/g, " "), 180)}`;
          })
          .join("\n"),
        metadata: { scanned: rows.length, matched: matched.length },
      };
    },
  },
  {
    name: "session_context",
    description: "Session bootstrap: active goal, last objective, and cross-session links for the current workspace.",
    input: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const [boot, links] = await Promise.all([
        kernel("/api/memory/session-bootstrap", { budget: FAST_BUDGET }),
        kernel("/api/memory/cross-session-links", { method: "POST", body: { limit: 8 }, budget: FAST_BUDGET }),
      ]);
      return {
        content: JSON.stringify({ bootstrap: unwrap(boot), crossSessionLinks: unwrap(links) }, null, 2),
      };
    },
  },
  {
    name: "session_handoff",
    description: "Persist or restore a session handoff artifact (goal continuity across harnesses).",
    input: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["write", "pickup"], description: "Write a handoff or pick up the last one." },
        summary: str("Handoff summary (required for write)."),
        artifact: str("Artifact name to restore (optional for pickup)."),
      },
      required: ["action"],
      additionalProperties: false,
    },
    async run({ action, summary, artifact }) {
      if (action === "pickup") {
        const res = await kernel("/api/agent-memory/pickup", {
          method: "POST",
          body: artifact ? { artifact: String(artifact) } : {},
          budget: FAST_BUDGET,
        });
        return { content: JSON.stringify(unwrap(res) ?? { error: res.error }, null, 2) };
      }
      const res = await kernel("/api/agent-memory/handoff", {
        method: "POST",
        body: {
          summary: String(summary ?? ""),
          content: String(summary ?? ""),
          client: "opencode",
          metadata: { source: "opencode-plugin" },
        },
        budget: FAST_BUDGET,
      });
      return {
        content: res.ok ? "Handoff stored." : `[hypernexus] handoff failed: ${res.error}`,
        metadata: { ok: res.ok },
      };
    },
  },
  {
    name: "skill_search",
    description: "Search the HyperNexus skill registry for reusable capability modules (SKILL.md).",
    input: {
      type: "object",
      properties: { query: str("Search text."), limit: int("Max results", 8) },
      required: ["query"],
      additionalProperties: false,
    },
    async run({ query, limit }) {
      const res = await kernel(
        `/api/skills/search?q=${encodeURIComponent(String(query))}&limit=${Math.min(25, Number(limit) || 8)}`,
        { budget: FAST_BUDGET }
      );
      const rows = asList(unwrap(res));
      if (!rows.length) return { content: "No skills matched." };
      return {
        content: rows
          .map((s) => {
            const r = recOf(s) || {};
            return `- ${String(r.name ?? r.id ?? "?")}: ${clamp(String(r.description ?? r.summary ?? ""), 160)}`;
          })
          .join("\n"),
        metadata: { count: rows.length },
      };
    },
  },
  {
    name: "skill_manage",
    description: "List, read, or create HyperNexus skills (reusable SKILL.md capability modules).",
    input: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "read", "create"], description: "Operation." },
        name: str("Skill name (for read)."),
        content: str("SKILL.md content (for create)."),
      },
      required: ["action"],
      additionalProperties: false,
    },
    async run({ action, name, content }) {
      if (action === "read") {
        const res = await kernel(`/api/skills/read?name=${encodeURIComponent(String(name || ""))}`, { budget: FAST_BUDGET });
        const data = unwrap(res) ?? res.error;
        return { content: typeof data === "string" ? data : JSON.stringify(data, null, 2) };
      }
      if (action === "create") {
        const res = await kernel("/api/skills/create", {
          method: "POST",
          body: { name: String(name || "unnamed"), content: String(content || "") },
          budget: FAST_BUDGET,
        });
        return {
          content: res.ok ? "Skill created." : `[hypernexus] skill_create failed: ${res.error}`,
          metadata: { ok: res.ok },
        };
      }
      const res = await kernel("/api/skills", { budget: FAST_BUDGET });
      const rows = asList(unwrap(res));
      return {
        content: rows
          .map((s) => {
            const r = recOf(s) || {};
            return `- ${String(r.name ?? r.id ?? "?")}`;
          })
          .join("\n") || "No skills registered.",
        metadata: { count: rows.length },
      };
    },
  },
  {
    name: "code_search",
    description: "Search code via the native router. Modes: symbols | definitions | references | files.",
    input: {
      type: "object",
      properties: {
        query: str("Symbol, path pattern, or concept."),
        mode: { type: "string", enum: ["symbols", "definitions", "references", "files"], description: "Search mode (default symbols)." },
        limit: int("Max results", 10),
      },
      required: ["query"],
      additionalProperties: false,
    },
    async run({ query, mode, limit }) {
      const m = String(mode || "symbols");
      const res = await kernel(
        `/api/mcp/native/search?query=${encodeURIComponent(`${m} ${clamp(String(query), 160)}`)}&limit=${Math.min(25, Number(limit) || 10)}`,
        { budget: FAST_BUDGET }
      );
      return { content: JSON.stringify(unwrap(res) ?? res.error, null, 2) };
    },
  },
  {
    name: "memory_relate",
    description: "Link two memories in the knowledge graph (source_id â†’ relation_type â†’ target_id) with an optional weight.",
    input: {
      type: "object",
      properties: {
        source_id: str("Source memory id (from search/list results)."),
        target_id: str("Target memory id."),
        relation_type: str("Relation, e.g. 'uses', 'causes', 'fixes', 'supersedes'."),
        weight: { type: "number", description: "Strength 0..1 (default 0.8)." },
      },
      required: ["source_id", "target_id", "relation_type"],
      additionalProperties: false,
    },
    async run({ source_id, target_id, relation_type, weight }) {
      const res = await kernel("/api/memory/relations/add", {
        method: "POST",
        body: {
          source_id: String(source_id),
          target_id: String(target_id),
          relation_type: String(relation_type),
          weight: Number(weight ?? 0.8),
        },
        budget: SLOW_BUDGET,
      });
      return {
        content: res.ok
          ? `Linked ${source_id} â€”[${relation_type}]â†’ ${target_id}`
          : `[hypernexus] memory_relate failed: ${res.error}`,
        metadata: { ok: res.ok },
      };
    },
  },
  {
    name: "knowledge_graph",
    description: "Read the knowledge graph: entities and relations derived from memory (nodes/edges).",
    input: {
      type: "object",
      properties: { focus: str("Optional entity or concept to focus on.") },
      additionalProperties: false,
    },
    async run({ focus }) {
      const [graph, relations] = await Promise.all([
        kernel(`/api/memory/graph?limit=100`, { budget: FAST_BUDGET }),
        kernel(
          `/api/memory/relations/graph${focus ? `?id=${encodeURIComponent(String(focus))}` : ""}`,
          { budget: FAST_BUDGET }
        ),
      ]);
      return { content: JSON.stringify({ graph: unwrap(graph), relations: unwrap(relations) }, null, 2) };
    },
  },
  {
    name: "billing_status",
    description: "Provider billing, quotas, depleted models, and the fallback chain.",
    input: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const [status, chain, depleted] = await Promise.all([
        kernel("/api/billing/status", { budget: FAST_BUDGET }),
        kernel("/api/billing/fallback-chain", { budget: FAST_BUDGET }),
        kernel("/api/billing/depleted-models", { budget: FAST_BUDGET }),
      ]);
      return {
        content: JSON.stringify({ status: unwrap(status), fallbackChain: unwrap(chain), depleted: unwrap(depleted) }, null, 2),
      };
    },
  },
  {
    name: "memory_delete",
    description: "Delete an L2 memory by id, or every memory carrying a tag (capped fan-out). Use for cleanup of stale or wrong facts.",
    input: {
      type: "object",
      properties: {
        id: str("Memory id to delete (from search/list results)."),
        tag: str("Alternative: delete all memories carrying this tag (max 20)."),
      },
      additionalProperties: false,
    },
    async run({ id, tag }) {
      if (id) {
        const res = await kernel("/api/agent-memory/delete", {
          method: "POST",
          body: { id: String(id) },
          budget: FAST_BUDGET,
        });
        return {
          content: res.ok ? `Deleted memory ${id}.` : `[hypernexus] memory_delete failed: ${res.error}`,
          metadata: { ok: res.ok, deleted: 1 },
        };
      }
      if (!tag) return { content: "[hypernexus] memory_delete requires id or tag.", metadata: { ok: false } };
      const found = await kernel(`/api/memory/fts-search?q=${encodeURIComponent(String(tag))}&limit=20`, { budget: FAST_BUDGET });
      const rows = asList(unwrap(found)).map(recOf);
      const targets = rows
        .filter((r) => memTags(r).some((t) => t.toLowerCase() === String(tag).toLowerCase()) || String(r?.id ?? "") === String(tag))
        .slice(0, 20);
      if (!targets.length) return { content: `No memories with tag "${tag}" found.`, metadata: { ok: true, deleted: 0 } };
      let deleted = 0;
      for (const row of targets) {
        const rid = String(row?.id ?? "");
        if (!rid) continue;
        const res = await kernel("/api/agent-memory/delete", { method: "POST", body: { id: rid }, budget: FAST_BUDGET });
        if (res.ok) deleted++;
      }
      return {
        content: `Deleted ${deleted}/${targets.length} memories with tag "${tag}".`,
        metadata: { ok: deleted > 0, deleted },
      };
    },
  },
  {
    name: "audit_log",
    description: "Record an action to the HyperNexus audit/observation trail (compliance, RBAC evidence).",
    input: {
      type: "object",
      properties: {
        action: str("Action name, e.g. 'deploy', 'file_write'."),
        target: str("Target: file path, URL, tool name."),
        result: str("Outcome."),
      },
      required: ["action", "target"],
      additionalProperties: false,
    },
    async run({ action, target, result }) {
      audit({
        type: "progress",
        title: `audit:${action}`,
        content: `${action} Ã¢â€ â€™ ${target}${result ? `: ${result}` : ""}`,
        toolName: "opencode.audit_log",
        metadata: { action, target, result },
      });
      return { content: "Audit entry queued." };
    },
  },
  {
    name: "subagent",
    description: "Record a task / TODO to L2 memory for tracking and later recall. This records intent — it does NOT spawn a live sub-agent. Retrieve with hypernexus_memory_search (tag subagent).",
    input: {
      type: "object",
      properties: {
        task: str("Task description for the subagent."),
        context: str("Optional context the subagent needs."),
      },
      required: ["task"],
      additionalProperties: false,
    },
    async run({ task, context }) {
      const content = `[SUBAGENT TASK] ${task}${context ? `\n\nContext: ${context}` : ""}`;
      const res = await kernel("/api/memory/add", {
        method: "POST",
        body: { content, category: "subagent", tags: ["client:opencode", "subagent"] },
        budget: FAST_BUDGET,
      });
      return {
        content: res.ok
          ? "Sub-task dispatched to HyperNexus orchestration (tracked in L2 under category 'subagent')."
          : `[hypernexus] dispatch failed: ${res.error}`,
        metadata: { ok: res.ok },
      };
    },
  },
  {
    name: "workflow",
    description: "List or run HyperNexus engineering workflows (full-build, submodule-sync, etc.) for orchestration.",
    input: {
      type: "object",
      properties: {
        action: str("Action: 'list' or 'run'."),
        id: str("Workflow id (required for action=run)."),
      },
      required: ["action"],
      additionalProperties: false,
    },
    async run({ action, id }) {
      if (action === "run") {
        if (!id) return { content: "Usage: workflow {action:'run', id:'<workflow-id>'} — id is required.", metadata: { ok: false } };
        const res = await kernel(`/api/workflows/${encodeURIComponent(String(id))}/run`, {
          method: "POST",
          body: {},
          budget: CALL_BUDGET,
        });
        return {
          content: JSON.stringify(unwrap(res) ?? { error: res.error, raw: res.data }, null, 2).slice(0, 1500),
          metadata: { ok: res.ok },
        };
      }
      const res = await kernel("/api/workflows", { budget: FAST_BUDGET });
      const body = unwrap(res);
      const wfs = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      const items = (Array.isArray(wfs) ? wfs : [])
        .map((w, i) => `  ${i + 1}. ${w.id ?? w.name ?? "?"} - ${String(w.description ?? "").slice(0, 80)}`)
        .join("\n");
      return { content: `Workflows:\n${items || "(none)"}`, metadata: { ok: res.ok } };
    },
  },
  {
    name: "orchestrate",
    description: "Run the RECALL -> DISCOVER -> PERSIST leg of the orchestration loop for a task in one call: harvests relevant memory, finds candidate tools, and records the task. EXECUTE is left to the model using the discovered tools.",
    input: {
      type: "object",
      properties: {
        task: str("The task to orchestrate."),
      },
      required: ["task"],
      additionalProperties: false,
    },
    async run({ task }) {
      const t = String(task || "").trim();
      if (!t) return { content: "Provide a task.", metadata: { ok: false } };
      const q = encodeURIComponent(clamp(t, 160));
      const steps = [];
      const recall = await kernel(`/api/memory/search?query=${q}&limit=3`, { budget: SLOW_BUDGET });
      const memories = unwrap(recall);
      steps.push(`RECALL: ${JSON.stringify(memories).slice(0, 240)}`);
      const discover = await kernel(`/api/tools/search?query=${q}&limit=3`, { budget: SLOW_BUDGET });
      steps.push(`DISCOVER: ${JSON.stringify(unwrap(discover)).slice(0, 240)}`);
      const persist = await kernel("/api/memory/facts/add", {
        method: "POST",
        body: {
          title: `orchestrated: ${clamp(t, 80)}`,
          content: `[ORCHESTRATED] ${t}`,
          tags: ["system:orchestrated", "client:opencode"],
          namespace: "project",
        },
        budget: FAST_BUDGET,
      });
      steps.push(`PERSIST: ${persist.ok ? "task recorded in L2" : `failed (${persist.error})`}`);
      steps.push("EXECUTE: perform the task using the discovered tools above.");
      return { content: `Orchestrated "${t}":\n\n${steps.join("\n\n")}`, metadata: { ok: recall.ok || discover.ok || persist.ok } };
    },
  },
  {
    name: "browser",
    description: "Browser automation: scrape a URL or check browser-service status. Degrades gracefully when the browser service isn't running.",
    input: {
      type: "object",
      properties: {
        action: str("Action: 'status' or 'scrape'."),
        url: str("URL to scrape (required for action=scrape)."),
      },
      required: ["action"],
      additionalProperties: false,
    },
    async run({ action, url }) {
      if (action === "scrape") {
        if (!url) return { content: "Usage: browser {action:'scrape', url:'https://...'} — url is required.", metadata: { ok: false } };
        const res = await kernel("/api/browser/scrape", {
          method: "POST",
          body: { url: String(url) },
          budget: CALL_BUDGET,
        });
        if (!res.ok) {
          return {
            content: `Browser scrape unavailable (${res.error ?? `HTTP ${res.status}`}) — the browser service may not be running.`,
            metadata: { ok: false },
          };
        }
        return { content: JSON.stringify(unwrap(res) ?? res.data, null, 2).slice(0, 3000), metadata: { ok: true } };
      }
      const res = await kernel("/api/browser/status", { budget: FAST_BUDGET });
      return {
        content: res.ok
          ? JSON.stringify(unwrap(res) ?? res.data, null, 2).slice(0, 500)
          : `Browser service not running (${res.error ?? `HTTP ${res.status}`}). Start it to enable scraping.`,
        metadata: { ok: res.ok },
      };
    },
  },
  {
    name: "memory_stats",
    description: "Memory tier statistics: counts across L2 vault, scratchpad, and relation tiers.",
    input: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const res = await kernel("/api/agent-memory/stats", { budget: FAST_BUDGET });
      if (!res.ok) return { content: `[hypernexus] memory_stats failed: ${res.error}`, metadata: { ok: false } };
      return { content: JSON.stringify(unwrap(res) ?? res.data, null, 2).slice(0, 1200), metadata: { ok: true } };
    },
  },
  {
    name: "session_list",
    description: "List recent sessions across harnesses (who ran what, where) with per-CLI-type counts.",
    input: {
      type: "object",
      properties: { limit: int("Max sessions", 10) },
      additionalProperties: false,
    },
    async run({ limit }) {
      const n = Math.min(50, Number(limit) || 10);
      const res = await kernel(`/api/sessions/summary?limit=${n}`, { budget: FAST_BUDGET });
      if (!res.ok) return { content: `[hypernexus] session_list failed: ${res.error}`, metadata: { ok: false } };
      return { content: JSON.stringify(unwrap(res) ?? res.data, null, 2).slice(0, 2000), metadata: { ok: true } };
    },
  },
  {
    name: "repomap",
    description: "Generate a ranked repository map with symbol summaries for a directory (code navigation starting point).",
    input: {
      type: "object",
      properties: { dir: str("Directory to map (default workspace root).") },
      additionalProperties: false,
    },
    async run({ dir }) {
      const res = await kernel("/api/agent/tool", {
        method: "POST",
        body: { name: "repomap", args: { dir: String(dir ?? "") } },
        budget: CALL_BUDGET,
      });
      if (!res.ok) return { content: `[hypernexus] repomap failed: ${res.error}`, metadata: { ok: false } };
      return { content: JSON.stringify(unwrap(res) ?? res.data, null, 2).slice(0, 3000), metadata: { ok: true } };
    },
  },
];

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Commands Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const COMMANDS = [
  {
    name: "hn-status",
    description: "Show HyperNexus kernel status",
    kind: "report",
    async build() {
      const st = await getStatus();
      return `## HyperNexus status\n- kernel: ${st.ok ? `v${st.version} online` : "OFFLINE"}\n- MCP: ${st.mcp.connectedCount} server(s) connected\n- tools: ${st.tools ?? "?"}`;
    },
  },
  {
    name: "hn-store",
    description: "Store a memory Ã¢â‚¬â€ /hn-store <text> [tags: a,b]",
    kind: "report",
    async build(args) {
      const raw = String(args || "").trim();
      if (!raw) return "Usage: /hn-store <memory text> [tags: tag1,tag2]";
      const parts = raw.split("[tags:");
      const text = parts[0].trim();
      const tags = parts[1] ? parts[1].replace("]", "").split(",").map((t) => t.trim()).filter(Boolean) : [];
      const res = await kernel("/api/memory/facts/add", {
        method: "POST",
        body: { content: text, tags, namespace: "project", metadata: { source: "opencode-command", client: "opencode" } },
        budget: FAST_BUDGET,
      });
      return res.ok
        ? `Stored to L2 memory: "${clamp(text, 100)}"${tags.length ? ` [${tags.join(", ")}]` : ""}`
        : `Failed to store memory: ${res.error}`;
    },
  },
  {
    name: "hn-remember",
    description: "Store a decision/insight with category Ã¢â‚¬â€ /hn-remember <text> [tags: a,b]",
    kind: "report",
    async build(args) {
      const raw = String(args || "").trim();
      if (!raw) return "Usage: /hn-remember <decision or insight> [tags: tag1,tag2]";
      const parts = raw.split("[tags:");
      const text = parts[0].trim();
      const tags = parts[1] ? parts[1].replace("]", "").split(",").map((t) => t.trim()).filter(Boolean) : ["decision"];
      const res = await kernel("/api/memory/facts/add", {
        method: "POST",
        body: { content: text, title: clamp(text, 60), tags, namespace: "project", metadata: { source: "opencode-command", client: "opencode" } },
        budget: FAST_BUDGET,
      });
      return res.ok ? `Remembered: "${clamp(text, 100)}"` : `Failed: ${res.error}`;
    },
  },
  {
    name: "hn-search",
    description: "Search L2 memory Ã¢â‚¬â€ /hn-search <query>",
    kind: "context",
    async build(args) {
      const q = String(args || "").trim();
      if (!q) return "Usage: /hn-search <query>";
      const res = await kernel(`/api/memory/search?query=${encodeURIComponent(q)}&limit=6`, { budget: SLOW_BUDGET });
      const rows = asList(unwrap(res));
      if (!rows.length) return `No memories found for "${q}".`;
      return `HyperNexus memory results for "${q}":\n${rows.map((m) => fmtMemory(m, 260)).join("\n")}`;
    },
  },
  {
    name: "hn-tools",
    description: "Discover MCP tools Ã¢â‚¬â€ /hn-tools <what you need>",
    kind: "context",
    async build(args) {
      const q = String(args || "").trim();
      if (!q) return "Usage: /hn-tools <capability description>";
      const res = await kernel(`/api/tools/search?query=${encodeURIComponent(q)}&limit=8`, { budget: FAST_BUDGET });
      const rows = asList(unwrap(res));
      if (!rows.length) return `No tools matched "${q}".`;
      return `HyperNexus tool matches for "${q}":\n${rows
        .map((t) => {
          const r = recOf(t) || {};
          return `- ${String(r.name ?? r.id ?? "?")}: ${clamp(String(r.description ?? ""), 140)}`;
        })
        .join("\n")}`;
    },
  },
  {
    name: "hn-session",
    description: "Resume context from imported sessions Ã¢â‚¬â€ /hn-session <query>",
    kind: "context",
    async build(args) {
      const q = String(args || "").trim();
      if (!q) return "Usage: /hn-session <query>";
      const res = await kernel(`/api/sessions/imported/list?limit=50`, { budget: FAST_BUDGET });
      const rows = asList(unwrap(res));
      const needle = q.toLowerCase();
      const matched = rows.filter((s) => JSON.stringify(recOf(s)).toLowerCase().includes(needle)).slice(0, 8);
      if (!matched.length) return `No imported sessions matched "${q}".`;
      return `Imported sessions matching "${q}":\n${matched
        .map((s) => {
          const r = recOf(s) || {};
          return `- ${String(r.id ?? r.path ?? "?")}: ${clamp(String(r.summary ?? r.title ?? "").replace(/\s+/g, " "), 160)}`;
        })
        .join("\n")}`;
    },
  },
  {
    name: "hn-context",
    description: "Harvest relevant L2 context for the current work",
    kind: "context",
    async build(args) {
      const topic = String(args || "").trim();
      const q = encodeURIComponent(clamp(topic || "current work", 160));
      const [mem, sums] = await Promise.all([
        kernel(`/api/memory/search?query=${q}&limit=5`, { budget: SLOW_BUDGET }),
        kernel(`/api/memory/session-summaries/search?query=${q}&limit=3`, { budget: SLOW_BUDGET }),
      ]);
      const rows = [...asList(unwrap(mem)), ...asList(unwrap(sums))];
      return rows.length
        ? `Harvested HyperNexus context:\n${rows.map((m) => fmtMemory(m, 280)).join("\n")}`
        : "No prior L2 context found.";
    },
  },
  {
    name: "hn-plan",
    description: "Store a plan to L2 Ã¢â‚¬â€ /hn-plan <plan text>",
    kind: "report",
    async build(args) {
      const text = String(args || "").trim() || "New plan";
      const res = await kernel("/api/memory/facts/add", {
        method: "POST",
        body: { content: text, title: `plan: ${clamp(text, 50)}`, tags: ["plan"], namespace: "project", metadata: { source: "opencode-command" } },
        budget: FAST_BUDGET,
      });
      return res.ok ? "Plan stored to L2 memory." : `Failed: ${res.error}`;
    },
  },
  {
    name: "hn-summary",
    description: "Summarize this session into L2 (model-generated when available)",
    kind: "report",
    async build(args, ctx, sessionID) {
      let transcript = "";
      try {
        const messages = await ctx.session.context({ sessionID });
        transcript = clamp(JSON.stringify(messages).replace(/\s+/g, " "), 6000);
      } catch {
        transcript = "";
      }
      let summary = String(args || "").trim();
      if (!summary && transcript) {
        try {
          const selected = await ctx.model.default();
          const model = selected
            ? { providerID: selected.providerID, id: selected.id ?? selected.modelID }
            : undefined;
          if (model?.providerID && model?.id) {
            const gen = await ctx.generate.text({
              model,
              prompt: `Summarize this coding session for a future agent. Preserve key decisions, file paths, gotchas, and next steps. Session transcript:\n${transcript}`,
            });
            summary = String(gen?.text ?? "").trim();
          }
        } catch {
          summary = "";
        }
      }
      if (!summary) summary = transcript ? `Session transcript excerpt:\n${clamp(transcript, 1200)}` : "Empty session.";
      const res = await kernel("/api/memory/facts/add", {
        method: "POST",
        body: { content: summary, title: "session summary", tags: ["session", "summary", "client:opencode"], namespace: "project", metadata: { source: "opencode-command" } },
        budget: SLOW_BUDGET,
      });
      return res.ok ? `## Session summary (stored to L2)\n${summary}` : `Failed to store summary: ${res.error}`;
    },
  },
  {
    name: "hn-restore",
    description: "Pick up the last HyperNexus session handoff (resume after a break)",
    kind: "report",
    async build() {
      const res = await kernel("/api/agent-memory/pickup", {
        method: "POST",
        body: {},
        budget: FAST_BUDGET,
      });
      const data = unwrap(res);
      if (!res.ok) return `No handoff available: ${res.error}`;
      return `## Restored HyperNexus handoff\n${clamp(JSON.stringify(data, null, 2), 1500)}`;
    },
  },
  {
    name: "hn-purge",
    description: "Delete a memory by id, or by tag Ã¢â‚¬â€ /hn-purge <id|tag>",
    kind: "report",
    async build(args) {
      const key = String(args || "").trim();
      if (!key) return "Usage: /hn-purge <memory id | tag>";
      // Id-shaped keys delete directly; anything else fans out over tag matches.
      const asId = /^[A-Za-z0-9_-]{8,}$/.test(key);
      if (asId) {
        const res = await kernel("/api/agent-memory/delete", { method: "POST", body: { id: key }, budget: FAST_BUDGET });
        return res.ok ? `Deleted memory ${key}.` : `Delete failed: ${res.error} Ã¢â‚¬â€ retrying as tag match is also allowed.`;
      }
      const found = await kernel(`/api/memory/fts-search?q=${encodeURIComponent(key)}&limit=20`, { budget: FAST_BUDGET });
      const rows = asList(unwrap(found)).map(recOf);
      const targets = rows.filter((r) => memTags(r).some((t) => t.toLowerCase() === key.toLowerCase())).slice(0, 20);
      if (!targets.length) return `No memories with tag "${key}" found.`;
      let deleted = 0;
      for (const row of targets) {
        const rid = String(row?.id ?? "");
        if (!rid) continue;
        const res = await kernel("/api/agent-memory/delete", { method: "POST", body: { id: rid }, budget: FAST_BUDGET });
        if (res.ok) deleted++;
      }
      return `Purged ${deleted}/${targets.length} memories matching tag "${key}".`;
    },
  },
];

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Skills (registered programmatically; also shipped as SKILL.md files) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const SKILLS = [
  {
    id: "hypernexus",
    name: "HyperNexus Memory",
    description: "Persistent multi-tier memory discipline for cross-session recall (L1/L2/L3).",
    content: `# HyperNexus Memory

Use the \`hypernexus_*\` tools for durable memory that survives across sessions and harnesses.

## Discipline
1. **RECALL first** Ã¢â‚¬â€ run \`hypernexus_context_harvest\` or \`hypernexus_memory_search\` before re-deriving known answers.
2. **PERSIST non-obvious outcomes** Ã¢â‚¬â€ decisions, gotchas, and fixes go to \`hypernexus_memory_store\` with tags.
3. **FAST on hot paths** Ã¢â‚¬â€ prefer \`hypernexus_memory_fts_search\` inside tight loops.
4. **Scratchpad for working state** Ã¢â‚¬â€ \`hypernexus_scratchpad\` holds short-lived keys (goal, phase).

## Inline recall
Write \`@memory:keyword\` in a prompt to expand matching L2 context inline.

## Observation types
Record structured findings with \`hypernexus_record_observation\`: discovery | decision | progress | warning | fix.
`,
  },
  {
    id: "hypernexus-ops",
    name: "HyperNexus Ops",
    description: "Operate and verify the HyperNexus kernel, MCP bridge, billing, and RBAC from the agent.",
    content: `# HyperNexus Ops

- \`hypernexus_status\` / \`hypernexus_system_overview\` Ã¢â‚¬â€ health before and after production changes.
- \`hypernexus_mcp_status\` / \`hypernexus_mcp_servers\` / \`hypernexus_mcp_tools\` Ã¢â‚¬â€ MCP bridge inventory.
- \`hypernexus_billing_status\` Ã¢â‚¬â€ quotas, depleted models, fallback chain.
- \`hypernexus_audit_log\` Ã¢â‚¬â€ record compliance-relevant actions.

## Verify loop
1. VERIFY before change: \`hypernexus_status\`
2. Act
3. VERIFY after change: \`hypernexus_status\`
4. PERSIST: \`hypernexus_memory_store\` with the outcome
`,
  },
  {
    id: "hypernexus-workflows",
    name: "HyperNexus Workflows",
    description: "Reusable orchestration workflows: MEM-FIRST, DISCOVER, HARVEST, HANDOFF, OPS.",
    content: `# HyperNexus Workflows

- **MEM-FIRST** (multi-step tasks): context_harvest Ã¢â€ â€™ memory_search Ã¢â€ â€™ <execute> Ã¢â€ â€™ memory_store
- **DISCOVER** (capability gap): suggest_tools Ã¢â€ â€™ tool_search Ã¢â€ â€™ mcp_call Ã¢â€ â€™ memory_store
- **HARVEST** (resuming after a break): context_harvest Ã¢â€ â€™ session_context Ã¢â€ â€™ memory_list
- **HANDOFF** (context switch / session end): session_handoff(write) Ã¢â€ â€™ memory_store(summary)
- **OPS** (deployments/incidents): system_overview Ã¢â€ â€™ <act> Ã¢â€ â€™ system_overview Ã¢â€ â€™ memory_store

Follow RECALL Ã¢â€ â€™ DISCOVER Ã¢â€ â€™ EXECUTE Ã¢â€ â€™ PERSIST Ã¢â€ â€™ VERIFY.
`,
  },
];

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ MCP stdio server resolution Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function resolveMcpCommand() {
  const override = process.env.HYPERNEXUS_MCP_COMMAND;
  if (override) return override.split(/\s+/).filter(Boolean);
  const exe = process.platform === "win32" ? "hypernexus.exe" : "hypernexus";
  const candidates = [
    path.join(process.cwd(), "bin", exe),
    path.join(os.homedir(), ".hypernexus", "bin", exe),
    path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..", "..", "..", "bin", exe),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return [c, "mcp"];
    } catch {
      /* ignore */
    }
  }
  return [process.platform === "win32" ? "hypernexus.exe" : "hypernexus", "mcp"]; // rely on PATH
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ V2 plugin Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

async function setup(ctx) {
  const options = ctx.options || {};
  const base = String(options.baseUrl || RUNTIME_BASE).replace(/\/+$/, "");
  RUNTIME_BASE = base;
  const kernelOpts = (extra = {}) => ({ base, ...extra });
  const kn = (endpoint, opts) => kernel(endpoint, kernelOpts(opts));

  const enabled = {
    tools: options.tools !== false,
    commands: options.commands !== false,
    skills: options.skills !== false,
    mcp: options.mcp !== false,
    worktree: options.worktree !== false,
    hooks: options.hooks !== false,
    suggestions: options.suggestions !== false,
    autoStore: options.autoStore !== false,
    contextInjection: options.contextInjection !== false,
    env: options.env !== false,
  };

  // Boot banner + reachability
  const health = await kn("/health", { budget: FAST_BUDGET });
  const where = ctx.location?.directory || process.cwd();
  console.error(
    `[hypernexus] opencode plugin v${PLUGIN_VERSION} loaded Ã¢â‚¬â€ kernel ${health.ok ? `v${health.data?.version} online` : `unreachable at ${base}`} @ ${where}`
  );
  try {
    await ctx.storage.set("boot", { at: new Date().toISOString(), kernelOk: !!health.ok, version: PLUGIN_VERSION });
  } catch {
    /* storage is optional */
  }

  const registrations = [];
  const track = (r) => {
    if (r && typeof r.dispose === "function") registrations.push(r);
    return r;
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Tools Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  try {
    if (enabled.tools) {
      track(
        await ctx.tool.transform((editor) => {
          editor.namespace({
            name: "hypernexus",
            description:
              "HyperNexus control plane: persistent L2/L3 memory, MCP tool discovery, sessions, skills, knowledge graph, billing, and audit.",
          });
          for (const tool of TOOLS) {
            editor.add({
              name: tool.name,
              description: tool.description,
              input: tool.input,
              options: { namespace: "hypernexus" },
              execute: async (input, context) => {
                try {
                  context?.progress?.({ status: tool.name }).catch?.(() => {});
                  const out = await tool.run(input || {}, ctx, context);
                  return {
                    content: typeof out?.content === "string" ? out.content : JSON.stringify(out?.content ?? out, null, 2),
                    ...(out?.metadata ? { metadata: out.metadata } : {}),
                  };
                } catch (err) {
                  return { content: `[hypernexus] ${tool.name} failed: ${String(err?.message || err)}`, metadata: { ok: false } };
                }
              },
            });
          }
        })
      );
    }
  } catch (err) {
    console.error(`[hypernexus] tool registration skipped: ${String(err?.message || err)}`);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Commands Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  try {
    if (enabled.commands) {
      track(
        await ctx.command.transform((editor) => {
          for (const cmd of COMMANDS) {
            editor.add({
              name: cmd.name,
              description: cmd.description,
              execute: async ({ sessionID, prompt, delivery }) => {
                try {
                  const args = String(prompt?.text ?? prompt?.arguments ?? "").trim();
                  const text = await cmd.build(args, ctx, sessionID);
                  if (cmd.kind === "context") {
                    await ctx.session.prompt({ ...prompt, sessionID, text, delivery });
                  } else {
                    await ctx.session.synthetic({ sessionID, text });
                  }
                } catch (err) {
                  await ctx.session
                    .synthetic({ sessionID, text: `[hypernexus] ${cmd.name} failed: ${String(err?.message || err)}` })
                    .catch(() => {});
                }
              },
            });
          }
        })
      );
    }
  } catch (err) {
    console.error(`[hypernexus] command registration skipped: ${String(err?.message || err)}`);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Skills Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  try {
    if (enabled.skills) {
      // Skill.Info requires `path` (validated by schema) Ã¢â‚¬â€ materialize each SKILL.md
      // so the registration is self-contained even without the installer.
      const skillRoot = path.join(ctx.location?.directory || process.cwd(), ".opencode", "skills");
      const resolved = SKILLS.map((skill) => {
        const candidates = [
          path.join(skillRoot, skill.id, "SKILL.md"),
          path.join(opencodeSkillsFallback(skillRoot, skill.id)),
        ];
        let skillPath = candidates.find((p) => fs.existsSync(p));
        if (!skillPath) {
          skillPath = candidates[0];
          try {
            fs.mkdirSync(path.dirname(skillPath), { recursive: true });
            fs.writeFileSync(skillPath, skill.content, "utf8");
          } catch {
            /* fall through Ã¢â‚¬â€ path is still provided for the schema */
          }
        }
        return { ...skill, path: skillPath };
      });
      track(
        await ctx.skill.transform((editor) => {
          for (const skill of resolved) {
            if (editor.get?.(skill.id)) continue;
            editor.add({
              id: skill.id,
              name: skill.name,
              description: skill.description,
              path: skill.path,
              content: skill.content,
            });
          }
        })
      );
    }
  } catch (err) {
    console.error(`[hypernexus] skill registration skipped: ${String(err?.message || err)}`);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ MCP server registration (kernel stdio bridge) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (enabled.mcp) {
    try {
      track(
        await ctx.mcp.transform((editor) => {
          if (editor.get?.("hypernexus")) return; // respect explicit user config
          const command = resolveMcpCommand();
          editor.set("hypernexus", {
            type: "local",
            command,
            environment: {
              HYPERNEXUS_URL: base,
              HYPERNEXUS_WORKSPACE_ROOT: String(ctx.location?.directory || process.cwd()),
            },
            ...(options.mcpCodemode === false ? { codemode: false } : {}),
            timeout: { startup: 45000 },
          });
        })
      );
    } catch (err) {
      console.error(`[hypernexus] MCP registration skipped: ${String(err?.message || err)}`);
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Worktree strategy (HyperNexus-managed local worktrees) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (enabled.worktree) {
    try {
      track(
        await ctx.worktree.transform((editor) => {
          editor.add({
            id: "hypernexus",
            async create({ directory }, { signal }) {
              fs.mkdirSync(directory, { recursive: true });
              fs.writeFileSync(
                path.join(directory, ".hypernexus-worktree.json"),
                JSON.stringify({ managedBy: "hypernexus", created: new Date().toISOString(), client: "opencode" }),
                "utf8"
              );
              return { directory };
            },
            async remove({ directory, force }) {
              const marker = path.join(directory, ".hypernexus-worktree.json");
              if (fs.existsSync(marker)) fs.rmSync(marker, { force: true });
              if (force) {
                const entries = fs.readdirSync(directory, { withFileTypes: true }).filter((e) => e.name !== ".git");
                if (entries.length === 0) fs.rmdirSync(directory);
              }
            },
            async list(sourceDirectory) {
              const out = [];
              try {
                for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
                  if (!entry.isDirectory()) continue;
                  const marker = path.join(sourceDirectory, entry.name, ".hypernexus-worktree.json");
                  if (fs.existsSync(marker)) {
                    out.push({ directory: path.join(sourceDirectory, entry.name), type: "worktree" });
                  }
                }
              } catch {
                /* ignore */
              }
              return out;
            },
          });
        })
      );
    } catch (err) {
      console.error(`[hypernexus] worktree strategy skipped: ${String(err?.message || err)}`);
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Session hooks Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  try {
  if (enabled.hooks) {
    // Prompt admission: @memory expansion + suggestion feed + session priming
    track(
      await ctx.session.hook("prompt", async (event) => {
        try {
          const sessionID = event.sessionID;
          const deadline = Date.now() + HOOK_BUDGET;
          let text = String(event.prompt?.text ?? "");
          if (/@memory:/.test(text)) {
            text = await expandMemoryRefs(text, deadline, event.prompt);
            event.prompt.text = text;
          }
          if (enabled.suggestions) {
            const last = caches.fedAt.get(sessionID) || 0;
            if (Date.now() - last > 5000) {
              caches.fedAt.set(sessionID, Date.now());
              feedSuggestions("user", text);
            }
          }
          if (!caches.booted.has(sessionID)) {
            caches.booted.add(sessionID);
            audit({ type: "progress", title: "session-start", content: `opencode session ${sessionID} started`, toolName: "opencode.session" });
            const boot = await kn("/api/memory/session-bootstrap", { budget: HOOK_BUDGET });
            const goal = unwrap(boot)?.activeGoal;
            if (goal) {
              const note = `\n\n[HyperNexus continuity] Active goal: ${clamp(String(goal), 200)}`;
              event.prompt.text = `${event.prompt.text}${note}`;
            }
          }
        } catch {
          /* never block admission */
        }
      })
    );

    // Context hook: compact status + fast recall + proactive suggestions
    if (enabled.contextInjection) {
      track(
        await ctx.session.hook("context", async (event) => {
          try {
            if (event.kind && event.kind !== "primary") return; // skip title/compaction/generate requests
            const messages = event.messages || [];
            let lastUser = "";
            let lastAssistant = "";
            for (let i = messages.length - 1; i >= 0; i--) {
              const m = messages[i];
              const role = m?.role ?? m?.info?.role;
              const text = typeof m?.content === "string" ? m.content : JSON.stringify(m?.content ?? m?.parts ?? "");
              if (role === "user" && !lastUser) lastUser = text;
              if (role === "assistant" && !lastAssistant) lastAssistant = text;
              if (lastUser && lastAssistant) break;
            }
            if (enabled.suggestions && lastAssistant) {
              const fed = caches.fedAt.get(`${event.sessionID}:asst`) || 0;
              if (Date.now() - fed > 8000) {
                caches.fedAt.set(`${event.sessionID}:asst`, Date.now());
                feedSuggestions("assistant", lastAssistant);
              }
            }
            const block = await buildSystemBlock(lastUser);
            if (block) event.system.push({ type: "text", text: `\n${block}\n` });
          } catch {
            /* never block the model call */
          }
        })
      );
    }

    // Compaction: preserve HyperNexus pointers in summaries
    track(
      await ctx.session.hook("compaction", (event) => {
        try {
          event.system.push({
            type: "text",
            text:
              "\nWhen summarizing: preserve hypernexus_memory_store facts, key file paths, decisions, and unresolved goals. " +
              "Cross-session knowledge lives in HyperNexus L2 memory (hypernexus_memory_search can recover dropped details).\n",
          });
        } catch {
          /* ignore */
        }
      })
    );

    // Model request: identify the client to providers/proxies via a header
    track(
      await ctx.session.hook("model.request", (event) => {
        try {
          event.headers = event.headers || {};
          event.headers["x-hypernexus-client"] = `opencode/${PLUGIN_VERSION}`;
          event.headers["x-hypernexus-session"] = String(event.sessionID || "");
        } catch {
          /* ignore */
        }
      })
    );

    // Retry observability + retry budget: record provider failures for
    // billing/routing insight, and cap retries so a dead provider cannot hold
    // the session's message queue hostage. Observed live (2026-10-21): a 503
    // "Endpoint is unavailable" provider retried 5+ times while queued command
    // outputs (ctx.session.synthetic) never landed. Terminal-fail fast instead:
    // the turn ends, report outputs flow, and the user sees the error.
    track(
      await ctx.session.hook("retry", (event) => {
        try {
          audit({
            type: "warning",
            title: `provider-retry:${event.error?.type ?? "unknown"}`,
            content: `model=${event.model?.providerID ?? "?"}/${event.model?.id ?? "?"} attempt=${event.attempt} status=${event.error?.status ?? "?"} ${clamp(event.error?.message ?? "", 160)}`,
            toolName: "opencode.retry",
            metadata: { attempt: event.attempt, decision: event.decision },
          });
          const status = event.error?.status;
          const hardFail = status === 500 || status === 502 || status === 503 || event.error?.type === "provider.internal";
          const cap = hardFail ? 3 : 5;
          if (event.decision?.retry && event.attempt >= cap) {
            event.decision = { retry: false };
            audit({
              type: "warning",
              title: "provider-retry-capped",
              content: `gave up after attempt ${event.attempt} (${event.error?.type ?? "unknown"}/${status ?? "?"}) so the session queue keeps flowing`,
              toolName: "opencode.retry",
              metadata: { attempt: event.attempt, status, hardFail },
            });
          }
        } catch {
          /* ignore */
        }
      })
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Tool hooks: RBAC + audit + auto-store Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  } catch (err) {
    console.error(`[hypernexus] session hooks skipped: ${String(err?.message || err)}`);
  }
  try {
  if (enabled.hooks) {
    track(
      await ctx.tool.hook("execute.before", (event) => {
        try {
          const hit = dangerousMatch(`${event.tool} ${JSON.stringify(event.input ?? {})}`);
          if (hit && rbacMode() !== "audit") {
            audit({ type: "warning", title: `rbac-${rbacMode()}:${event.tool}`, content: `dangerous pattern: ${hit}`, toolName: event.tool });
          }
        } catch {
          /* ignore */
        }
      })
    );

    track(
      await ctx.tool.hook("execute.after", (event) => {
        try {
          const toolName = String(event.tool || "");
          if (toolName.startsWith("hypernexus_")) return;
          const captured = event.status === "completed" && captureFileObservation(toolName, event.input);
          if (!captured) {
            audit({
              type: "progress",
              title: `tool:${toolName}`,
              content: `${toolName} ${event.status}`,
              toolName,
              metadata: { status: event.status },
            });
          }
          if (enabled.autoStore && event.status === "completed") {
            const text =
              typeof event.result?.content === "string"
                ? event.result.content
                : JSON.stringify(event.result?.content ?? event.result ?? "");
            autoStoreResult(toolName, event.input, text);
          }
        } catch {
          /* ignore */
        }
      })
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Permission hook: kernel-aware RBAC Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  } catch (err) {
    console.error(`[hypernexus] tool hooks skipped: ${String(err?.message || err)}`);
  }
  try {
  if (enabled.hooks) {
    track(
      await ctx.permission.hook("evaluate", (event) => {
        try {
          const mode = rbacMode();
          if (mode === "audit") return;
          const hit = dangerousMatch(`${event.action} ${(event.resources || []).join(" ")}`);
          if (!hit) return;
          audit({
            type: "warning",
            title: `rbac-${mode}:${event.action}`,
            content: `dangerous action ${event.action} on ${clamp((event.resources || []).join(", "), 200)} (pattern ${hit})`,
            toolName: "opencode.permission",
          });
          event.effect = mode === "deny" ? "deny" : "ask";
          event.message = `HyperNexus RBAC (${mode}): destructive pattern matched (${hit}).`;
        } catch {
          /* never break permission flow */
        }
      })
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Shell hook: env injection Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  } catch (err) {
    console.error(`[hypernexus] permission hook skipped: ${String(err?.message || err)}`);
  }
  try {
  if (enabled.hooks && enabled.env) {
    track(
      await ctx.shell.hook("create.before", (event) => {
        try {
          event.env = event.env || {};
          event.env.HYPERNEXUS_URL = base;
          event.env.HYPERNEXUS_CLIENT = `opencode/${PLUGIN_VERSION}`;
        } catch {
          /* ignore */
        }
      })
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Event stream: turn observation (fire-and-forget) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  } catch (err) {
    console.error(`[hypernexus] shell hook skipped: ${String(err?.message || err)}`);
  }
  try {
    const controller = new AbortController();
    registrations.push({ dispose: async () => controller.abort() });
    void (async () => {
      try {
        for await (const evt of ctx.event.subscribe({ signal: controller.signal })) {
          try {
            const type = String(evt?.type ?? "");
            if (!type.includes("message")) continue;
            const props = evt?.properties ?? {};
            const info = props.info ?? props;
            if (info?.role === "assistant" && (info?.status === "done" || info?.completed)) {
              audit({ type: "progress", title: "turn-end", content: `assistant turn completed in session ${evt?.properties?.sessionID ?? info?.sessionID ?? "?"}`, toolName: "opencode.events" });
            }
          } catch {
            /* ignore per-event errors */
          }
        }
      } catch {
        /* stream closed */
      }
    })();
  } catch {
    /* event subscription is optional */
  }

  // Cleanup: dispose registrations and flush the audit queue
  return async () => {
    try {
      await flushAudit();
    } catch {
      /* ignore */
    }
    for (const r of registrations) {
      try {
        await r.dispose();
      } catch {
        /* ignore */
      }
    }
  };
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ V1 compatibility (OpenCode 1.x plugin API) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

async function server(input, options = {}) {
  const base = String(options.baseUrl || RUNTIME_BASE).replace(/\/+$/, "");
  RUNTIME_BASE = base;
  const kn = (endpoint, opts) => kernel(endpoint, { base, ...opts });
  console.error(`[hypernexus] v1 server() shim active (kernel=${base})`);
  return {
    async "chat.message"(event) {
      try {
        const msg = event?.message ?? event;
        const content = String(msg?.content ?? msg?.text ?? "");
        if (content) feedSuggestions(msg?.role || "user", content);
      } catch {
        /* ignore */
      }
    },
    async "tool.execute.before"(event) {
      try {
        const hit = dangerousMatch(`${event?.tool ?? ""} ${JSON.stringify(event?.input ?? {})}`);
        if (hit && rbacMode() !== "audit") {
          audit({ type: "warning", title: `rbac:${event?.tool}`, content: hit, toolName: String(event?.tool ?? "tool") });
        }
      } catch {
        /* ignore */
      }
    },
    async "tool.execute.after"(event) {
      try {
        const toolName = String(event?.tool ?? event?.toolName ?? "");
        if (toolName.startsWith("hypernexus_")) return;
        audit({ type: "progress", title: `tool:${toolName}`, content: `${toolName} ok`, toolName });
        const text = typeof event?.output === "string" ? event.output : JSON.stringify(event?.output ?? event?.result ?? "");
        autoStoreResult(toolName, event?.input, text);
      } catch {
        /* ignore */
      }
    },
    async "permission.ask"(event, output) {
      try {
        const mode = rbacMode();
        const hit = dangerousMatch(`${event?.tool ?? ""} ${JSON.stringify(event?.input ?? {})}`);
        if (hit && mode === "deny" && output) output.status = "deny";
        else if (hit && mode === "ask" && output) output.status = "ask";
      } catch {
        /* ignore */
      }
    },
    async config(cfg) {
      try {
        console.error(`[hypernexus] config observed (plugins: ${cfg?.plugin?.length ?? 0})`);
      } catch {
        /* ignore */
      }
    },
    // Expose the tool catalog to V1 harnesses that read `tool` definitions.
    tool: Object.fromEntries(
      TOOLS.map((t) => [
        `hypernexus_${t.name}`,
        {
          description: t.description,
          args: t.input,
          async execute(args) {
            try {
              const out = await t.run(args || {}, null, null);
              return typeof out?.content === "string" ? out.content : JSON.stringify(out?.content ?? out, null, 2);
            } catch (err) {
              return `[hypernexus] ${t.name} failed: ${String(err?.message || err)}`;
            }
          },
        },
      ])
    ),
  };
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Export Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const plugin = {
  id: PLUGIN_ID,
  version: PLUGIN_VERSION,
  setup,
  server, // V1 harnesses call this; V2 reads id + setup()
};

export { setup, server, TOOLS, COMMANDS, SKILLS };
export default plugin;
