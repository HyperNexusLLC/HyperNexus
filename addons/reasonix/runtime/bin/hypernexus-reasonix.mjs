#!/usr/bin/env node
/**
 * HyperNexus Reasonix runtime sidecar — Extension Protocol v2 (NDJSON JSON-RPC 2.0 over stdio).
 *
 * Full bridge: Reasonix <-> HyperNexus kernel (default http://127.0.0.1:7778).
 *
 * Surfaces
 * --------
 *  - 36 model-callable tools (served as ext__hypernexus__<name>, declared in
 *    reasonix-plugin.json `runtime.tools`)
 *  - 10 intercept points (input.receive, context.prepare, tool.before/after,
 *    permission.decision, session.start/end, compaction.prepare,
 *    system_prompt.build, agent.before_start)
 *  - Fire-and-forget audit trail + auto-store of substantial tool results
 *  - @memory:key expansion on input.receive, fast-FTS context injection
 *
 * Contract (see addons/shared/hypernexus.manifest.json)
 * -----------------------------------------------------
 *  - Every kernel call is budgeted (AbortSignal.timeout) and NEVER throws.
 *  - Hot-path hooks use FTS-only search (<=400ms). Never vector search on a turn path.
 *  - Per-event side effects are fire-and-forget.
 *  - Response shapes are normalized at the adapter boundary.
 *  - This sidecar is `required: false` — a crash or handshake mismatch must
 *    never break the session; MCP + skills + commands keep working.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const VERSION = (() => {
  try {
    return fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
  } catch {
    return "1.0.22";
  }
})();

const BASE = (process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778").replace(/\/+$/, "");
const HOOK_BUDGET = Number(process.env.HYPERNEXUS_HOOK_BUDGET_MS || 400);
const FAST_BUDGET = Number(process.env.HYPERNEXUS_FAST_BUDGET_MS || 2500);
const SLOW_BUDGET = Number(process.env.HYPERNEXUS_SLOW_BUDGET_MS || 8000);
const CALL_BUDGET = Number(process.env.HYPERNEXUS_CALL_BUDGET_MS || 12000);
const MAX_STORE_CHARS = 4000;
const MAX_SYSTEM_BLOCK = 1400;

// ── small utilities ─────────────────────────────────────────────────────────

function clamp(text, n) {
  const s = String(text ?? "");
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function tryJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isAbort(err) {
  return !!err && (err.name === "AbortError" || err.name === "TimeoutError" || /abort|timeout/i.test(String(err?.message || err)));
}

// ── kernel client (budgeted, never throws) ───────────────────────────────────

async function kernel(endpoint, { method = "GET", body, budget = FAST_BUDGET } = {}) {
  const url = `${BASE}${endpoint}`;
  const started = Date.now();
  const timeout = AbortSignal.timeout(Math.max(50, budget));
  try {
    const res = await fetch(url, {
      method,
      signal: timeout,
      headers: {
        "Content-Type": "application/json",
        "X-HyperNexus-Client": `reasonix/${VERSION}`,
        ...(process.env.HYPERNEXUS_DASHBOARD_TOKEN
          ? { Authorization: `Bearer ${process.env.HYPERNEXUS_DASHBOARD_TOKEN}` }
          : {}),
      },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await res.text();
    const data = tryJson(text) ?? text;
    return { ok: res.ok, status: res.status, data, ms: Date.now() - started, ...(res.ok ? {} : { error: `HTTP ${res.status}` }) };
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

function recOf(x) {
  return x && typeof x === "object" && x.record && typeof x.record === "object" ? x.record : x;
}

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

// ── caches & fire-and-forget audit ───────────────────────────────────────────

const caches = {
  status: { at: 0, value: null },
  suggestions: { at: 0, value: null },
  mem: new Map(),
  fedAt: new Map(),
  booted: new Set(),
};
const SYS_TTL = 15_000;
const MEM_TTL = 30_000;
const SUG_TTL = 60_000;

function cacheGet(cache, key, ttl) {
  const hit = key ? cache.get?.(key) : cache;
  if (!hit || Date.now() - hit.at > ttl) return null;
  return hit.value;
}
function cacheSet(cache, key, value) {
  if (key) cache.set?.(key, { at: Date.now(), value });
  else cache.value = value, (cache.at = Date.now());
}

const auditQueue = [];
let auditTimer = null;
function audit(entry) {
  try {
    auditQueue.push({
      type: entry.type || "decision",
      content: clamp(String(entry.content ?? ""), 600),
      title: clamp(String(entry.title ?? entry.action ?? "reasonix-event"), 160),
      narrative: clamp(String(entry.narrative ?? entry.content ?? ""), 600),
      toolName: String(entry.toolName ?? "reasonix").slice(0, 64),
      concepts: Array.isArray(entry.concepts) ? entry.concepts.slice(0, 8).map((c) => String(c).slice(0, 48)) : [],
      filesRead: Array.isArray(entry.filesRead) ? entry.filesRead.slice(0, 10).map((f) => String(f).slice(0, 200)) : [],
      filesModified: Array.isArray(entry.filesModified) ? entry.filesModified.slice(0, 10).map((f) => String(f).slice(0, 200)) : [],
      metadata: { source: "reasonix-plugin", client: "reasonix", ...(entry.metadata || {}) },
    });
    if (auditQueue.length > 60) auditQueue.splice(0, auditQueue.length - 60);
    if (!auditTimer) {
      auditTimer = setTimeout(() => {
        auditTimer = null;
        void flushAudit();
      }, 4000);
      auditTimer.unref?.();
    }
  } catch { /* never throw */ }
}

async function flushAudit() {
  const batch = auditQueue.splice(0, 40);
  if (!batch.length) return;
  const filesModified = [...new Set(batch.flatMap((e) => e.filesModified || []))].slice(0, 20);
  const filesRead = [...new Set(batch.flatMap((e) => e.filesRead || []))].slice(0, 20);
  const types = [...new Set(batch.map((e) => e.type))];
  const combined = {
    type: types.length === 1 ? types[0] : "progress",
    title: `reasonix-activity:${batch.length} events`,
    content: batch.map((e) => `${e.title}: ${e.content}`).join("\n").slice(0, 2000),
    narrative: clamp(`Reasonix plugin batched ${batch.length} events (${types.join("/")}).`, 600),
    toolName: "reasonix.batch",
    concepts: ["reasonix-activity"],
    filesRead,
    filesModified,
    metadata: { source: "reasonix-plugin", client: "reasonix" },
  };
  const r = await kernel("/api/memory/observations/record", { method: "POST", body: combined, budget: FAST_BUDGET });
  if (!r.ok) {
    await kernel("/api/memory/facts/add", {
      method: "POST",
      body: { content: combined.content || combined.title, title: combined.title, tags: ["client:reasonix", "tool:reasonix.batch", combined.type], namespace: "project" },
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

// ── fast-context helpers (hot path: FTS only) ────────────────────────────────

function kernelKnownDown() {
  const st = caches.status.value;
  return !!st && st.ok === false && Date.now() - caches.status.at < SYS_TTL;
}

function applyEdits(text, edits) {
  if (!edits.length) return text;
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = text;
  for (const e of sorted) {
    if (e.start < 0 || e.end > out.length || e.start >= e.end) continue;
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  return out;
}

async function expandMemoryRefs(text, deadline) {
  if (!text || !/@memory:/.test(text)) return text;
  const re = /@memory:([\w.:-]+)/g;
  const edits = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const key = match[1];
    if (Date.now() > deadline) break;
    const left = Math.max(80, deadline - Date.now());
    const res = await kernel(`/api/memory/fts-search?q=${encodeURIComponent(key)}&limit=2`, { budget: Math.min(HOOK_BUDGET, left) });
    const rows = asList(unwrap(res)).slice(0, 2).map(recOf);
    if (!rows.length) continue;
    const ctx = rows.map((r) => `  - ${clamp(memContent(r).replace(/\s+/g, " "), 200)}`).join("\n");
    edits.push({ start: match.index, end: match.index + match[0].length, replacement: `[HyperNexus memory: ${key}]\n${ctx}` });
  }
  return applyEdits(text, edits);
}

async function harvestFast(text, deadline, limit = 3) {
  if (kernelKnownDown()) return [];
  const query = clamp(String(text || "").replace(/\s+/g, " ").trim(), 120);
  if (query.length < 8) return [];
  let h = 5381;
  for (let i = 0; i < query.length; i++) h = (Math.imul(h, 33) ^ query.charCodeAt(i)) >>> 0;
  const key = h.toString(36);
  const cached = cacheGet(caches.mem, key, MEM_TTL);
  if (cached) return cached;
  const res = await kernel(`/api/memory/fts-search?q=${encodeURIComponent(query)}&limit=${limit}`, {
    budget: Math.min(HOOK_BUDGET, Math.max(80, deadline - Date.now())),
  });
  const rows = asList(unwrap(res)).slice(0, limit).map(recOf);
  cacheSet(caches.mem, key, rows);
  return rows;
}

function feedSuggestions(role, content) {
  const text = clamp(String(content || ""), 500);
  if (text.length < 12) return;
  void kernel("/api/mcp/tool-suggestions", { method: "POST", body: { role, content: text }, budget: FAST_BUDGET });
}

async function getSuggestions() {
  if (kernelKnownDown()) return [];
  const cached = cacheGet(caches.suggestions, null, SUG_TTL);
  if (cached) return cached;
  const res = await kernel("/api/mcp/tool-suggestions", { budget: FAST_BUDGET });
  const list = asList(unwrap(res));
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
    mcp: { connected: !!unwrap(mcp)?.connected, connectedCount: unwrap(mcp)?.connectedCount ?? 0 },
    tools: unwrap(runtime)?.cli?.toolCount ?? null,
    providers: unwrap(runtime)?.providers ?? null,
  };
  cacheSet(caches.status, null, value);
  return value;
}

async function buildSystemBlock(lastUserText) {
  const deadline = Date.now() + HOOK_BUDGET;
  const parts = [];
  try {
    const st = await getStatus();
    if (st.ok) {
      parts.push(
        `HyperNexus kernel v${st.version} online — ${st.mcp.connectedCount} MCP servers connected` +
          (st.tools ? `, ${st.tools} tools` : "") +
          `. Tools: ext__hypernexus__memory_search, ext__hypernexus__tool_search, ext__hypernexus__context_harvest, ext__hypernexus__suggest_tools.`
      );
    } else {
      parts.push("HyperNexus kernel is offline — ext__hypernexus__* tools will report degraded status; rely on local tools.");
    }
    const [memories, suggestions] = await Promise.all([harvestFast(lastUserText, deadline, 3), getSuggestions()]);
    if (memories.length) parts.push("Relevant L2 memory (recall before re-deriving):\n" + memories.map((m) => fmtMemory(m)).join("\n"));
    if (suggestions.length) {
      const lines = suggestions.slice(0, 3).map((s) => {
        const name = String(s?.name ?? s?.tool ?? s?.id ?? "").slice(0, 48);
        const why = clamp(String(s?.reason ?? s?.description ?? s?.summary ?? ""), 90);
        return `- ${name}${why ? ` — ${why}` : ""}`;
      });
      if (lines.length) parts.push("Suggested tools for this conversation:\n" + lines.join("\n"));
    }
  } catch { /* never throw */ }
  return clamp(parts.join("\n\n"), MAX_SYSTEM_BLOCK);
}

// ── RBAC ─────────────────────────────────────────────────────────────────────

const DANGEROUS = [
  /\brm\s+-[a-z]*r/i, /\bmkfs\b/i, /\bdrop\s+(table|database)\b/i, /\btruncate\s+table\b/i,
  /\bgit\s+push\s+.*--force\b/i, /\bgit\s+reset\s+--hard\b/i, /\bformat\s+[a-z]:/i,
  /\bdel\s+\/[sf]\b/i, /\bRemove-Item\b.*-[rR]ecurse/i, /\bshutdown\b|\breboot\b/i, /\bDROP\s+SCHEMA\b/i,
];

function dangerousMatch(text) {
  const s = String(text ?? "");
  for (const re of DANGEROUS) if (re.test(s)) return re.source;
  return null;
}

function rbacMode() {
  const m = String(process.env.HYPERNEXUS_RBAC || "audit").toLowerCase();
  return m === "ask" || m === "deny" ? m : "audit";
}

const FILE_WRITE_TOOLS = new Set(["edit", "multiedit", "write", "apply_search_replace", "notebookedit", "write_file", "edit_file", "multi_edit", "move_file"]);
const FILE_READ_TOOLS = new Set(["read", "grep", "glob", "ls", "list", "codebase_search", "read_file"]);

function fileRefs(input) {
  const refs = [];
  for (const key of ["path", "file_path", "filePath", "notebook_path", "target", "dest", "destination"]) {
    const v = input?.[key];
    if (typeof v === "string" && v.length > 1) refs.push(v);
    if (Array.isArray(v)) for (const p of v) if (typeof p === "string") refs.push(p);
  }
  return [...new Set(refs)].slice(0, 10);
}

const storedHashes = new Set();
function autoStoreResult(toolName, text) {
  const content = String(text ?? "");
  if (content.length < 400) return;
  let h = 5381;
  const s = `${toolName}:${content}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  const key = h.toString(36);
  if (storedHashes.has(key)) return;
  storedHashes.add(key);
  if (storedHashes.size > 200) storedHashes.clear();
  audit({ type: "progress", title: `tool-result:${toolName}`, content, toolName, narrative: clamp(`Tool ${toolName} produced a substantial result.`, 300), metadata: { autoStore: true } });
  void kernel("/api/memory/facts/add", {
    method: "POST",
    body: { title: `tool-result:${toolName}`, content: clamp(content, MAX_STORE_CHARS), tags: ["client:reasonix", "tool-result", `tool:${clamp(String(toolName), 40)}`], namespace: "project" },
    budget: FAST_BUDGET,
  });
}

function captureFileObservation(toolName, input) {
  const name = String(toolName || "").toLowerCase();
  const refs = fileRefs(input);
  if (!refs.length) return false;
  if (FILE_WRITE_TOOLS.has(name)) {
    audit({ type: "progress", title: `file-change:${name}`, content: `${name} modified ${refs.join(", ")}`, narrative: `Tool ${toolName} modified ${refs.length} file(s).`, toolName: String(toolName), filesModified: refs, concepts: ["file-change"], metadata: { kind: "file-change" } });
    return true;
  }
  if (FILE_READ_TOOLS.has(name)) {
    audit({ type: "discovery", title: `file-read:${name}`, content: `${name} read ${refs.join(", ")}`, narrative: `Tool ${toolName} read ${refs.length} file(s).`, toolName: String(toolName), filesRead: refs, concepts: ["file-read"], metadata: { kind: "file-read" } });
    return true;
  }
  return false;
}

// ── tool implementations (kernel-backed) ─────────────────────────────────────

async function runTool(name, args = {}) {
  const a = args && typeof args === "object" ? args : {};
  switch (name) {
    case "status": {
      const st = await getStatus();
      const runtime = await kernel("/api/runtime/status", { budget: FAST_BUDGET });
      return { content: JSON.stringify({ status: st, runtime: unwrap(runtime) ?? runtime.error }, null, 2) };
    }
    case "system_overview": {
      const res = await kernel("/api/system/overview", { budget: FAST_BUDGET });
      return { content: JSON.stringify(unwrap(res) ?? res.error, null, 2) };
    }
    case "memory_store": {
      const res = await kernel("/api/memory/facts/add", {
        method: "POST",
        body: { content: String(a.content), title: a.title ? String(a.title) : undefined, tags: Array.isArray(a.tags) ? a.tags.map(String) : [], namespace: a.namespace ? String(a.namespace) : "project", metadata: { source: "reasonix-plugin", client: "reasonix" } },
        budget: SLOW_BUDGET,
      });
      if (!res.ok) return { content: `[hypernexus] memory_store failed: ${res.error}`, isError: true };
      const payload = unwrap(res) ?? {};
      const id = payload?.memory?.id ?? payload?.id ?? payload?.record?.id ?? null;
      return { content: "Stored to HyperNexus L2 memory.", extra: { id } };
    }
    case "memory_search": {
      const res = await kernel(`/api/memory/search?query=${encodeURIComponent(String(a.query))}&limit=${Math.min(20, Number(a.limit) || 8)}`, { budget: SLOW_BUDGET });
      const rows = asList(unwrap(res));
      if (!rows.length) return { content: "No memories matched." };
      return { content: rows.map((m) => fmtMemory(m, 300)).join("\n"), extra: { count: rows.length } };
    }
    case "memory_fts_search": {
      const res = await kernel(`/api/memory/fts-search?q=${encodeURIComponent(String(a.query))}&limit=${Math.min(20, Number(a.limit) || 8)}`, { budget: FAST_BUDGET });
      const rows = asList(unwrap(res)).map(recOf);
      if (!rows.length) return { content: "No memories matched." };
      return { content: rows.map((m) => fmtMemory(m, 300)).join("\n"), extra: { count: rows.length } };
    }
    case "memory_vector_search": {
      const q = encodeURIComponent(String(a.query));
      const [warm, coldRes] = await Promise.all([
        kernel(`/api/memory/search?query=${q}&limit=${Math.min(20, Number(a.limit) || 6)}`, { budget: SLOW_BUDGET }),
        a.cold === false ? Promise.resolve({ ok: false, data: null, error: "skipped" }) : kernel(`/api/memory/cold-archive/search?query=${q}&limit=3`, { budget: SLOW_BUDGET }),
      ]);
      const rows = asList(unwrap(warm));
      const old = asList(unwrap(coldRes));
      const out = [...rows.map((m) => fmtMemory(m, 300)), ...old.map((m) => fmtMemory(m, 300).replace(/^- /, "- [archived] "))];
      return { content: out.length ? out.join("\n") : "No memories matched.", extra: { l2: rows.length, l3: old.length } };
    }
    case "memory_list": {
      const res = await kernel(`/api/memory/list?limit=${Math.min(50, Number(a.limit) || 10)}`, { budget: FAST_BUDGET });
      const rows = asList(unwrap(res)).map(parseMaybeJson);
      if (!rows.length) return { content: "Memory vault is empty." };
      return { content: rows.map((m) => fmtMemory(m, 260)).join("\n"), extra: { count: rows.length } };
    }
    case "memory_delete": {
      if (a.id) {
        const res = await kernel("/api/agent-memory/delete", { method: "POST", body: { id: String(a.id) }, budget: FAST_BUDGET });
        return { content: res.ok ? `Deleted memory ${a.id}.` : `[hypernexus] memory_delete failed: ${res.error}`, isError: !res.ok };
      }
      if (!a.tag) return { content: "[hypernexus] memory_delete requires id or tag.", isError: true };
      const found = await kernel(`/api/memory/fts-search?q=${encodeURIComponent(String(a.tag))}&limit=20`, { budget: FAST_BUDGET });
      const rows = asList(unwrap(found)).map(recOf);
      const targets = rows.filter((r) => memTags(r).some((t) => t.toLowerCase() === String(a.tag).toLowerCase())).slice(0, 20);
      if (!targets.length) return { content: `No memories with tag "${a.tag}" found.` };
      let deleted = 0;
      for (const row of targets) {
        const rid = String(row?.id ?? "");
        if (!rid) continue;
        const res = await kernel("/api/agent-memory/delete", { method: "POST", body: { id: rid }, budget: FAST_BUDGET });
        if (res.ok) deleted++;
      }
      return { content: `Deleted ${deleted}/${targets.length} memories with tag "${a.tag}".` };
    }
    case "memory_relate": {
      const res = await kernel("/api/memory/relations/add", {
        method: "POST",
        body: { source_id: String(a.source_id), target_id: String(a.target_id), relation_type: String(a.relation_type), weight: Number(a.weight ?? 0.8) },
        budget: SLOW_BUDGET,
      });
      return { content: res.ok ? `Linked ${a.source_id} —[${a.relation_type}]→ ${a.target_id}` : `[hypernexus] memory_relate failed: ${res.error}`, isError: !res.ok };
    }
    case "scratchpad": {
      if (a.action === "set" || a.action === "append") {
        let merged = a.value ?? "";
        if (a.action === "append") {
          const cur = await kernel(`/api/memory/scratchpad/get?key=${encodeURIComponent(String(a.key))}`, { budget: FAST_BUDGET });
          const pad = unwrap(cur) ?? {};
          const existing = typeof pad?.[a.key] === "string" ? pad[a.key] : pad?.scratchpad?.[a.key] ?? pad?.value ?? "";
          merged = existing ? `${existing}\n${a.value ?? ""}` : String(a.value ?? "");
        }
        const res = await kernel("/api/memory/scratchpad/set", { method: "POST", body: { key: String(a.key), value: String(merged) }, budget: FAST_BUDGET });
        return { content: res.ok ? `Scratchpad[${a.key}] set.` : `[hypernexus] scratchpad set failed: ${res.error}`, isError: !res.ok };
      }
      const res = await kernel(`/api/memory/scratchpad/get?key=${encodeURIComponent(String(a.key))}`, { budget: FAST_BUDGET });
      const pad = unwrap(res) ?? {};
      const value = pad?.[a.key] ?? pad?.scratchpad?.[a.key] ?? pad ?? res.error;
      return { content: typeof value === "string" ? value : JSON.stringify(value, null, 2) };
    }
    case "context_harvest": {
      const q = encodeURIComponent(clamp(String(a.topic), 200));
      const n = Math.min(10, Number(a.limit) || 5);
      const [mem, sums, obs] = await Promise.all([
        kernel(`/api/memory/search?query=${q}&limit=${n}`, { budget: SLOW_BUDGET }),
        kernel(`/api/memory/session-summaries/search?query=${q}&limit=${n}`, { budget: SLOW_BUDGET }),
        kernel(`/api/memory/observations/search?query=${q}&limit=${n}`, { budget: SLOW_BUDGET }),
      ]);
      const sections = [["L2 memories", asList(unwrap(mem))], ["Session summaries", asList(unwrap(sums))], ["Observations", asList(unwrap(obs))]];
      const out = sections.filter(([, rows]) => rows.length).map(([label, rows]) => `## ${label}\n${rows.slice(0, n).map((m) => fmtMemory(m, 280)).join("\n")}`);
      return { content: out.length ? out.join("\n\n") : "No prior context found for this topic." };
    }
    case "record_observation": {
      const res = await kernel("/api/memory/observations/record", {
        method: "POST",
        body: { content: String(a.content), type: a.type ? String(a.type) : "discovery", title: a.title ? String(a.title) : undefined, concepts: Array.isArray(a.concepts) ? a.concepts.map(String) : [], filesRead: Array.isArray(a.filesRead) ? a.filesRead.map(String) : [], filesModified: Array.isArray(a.filesModified) ? a.filesModified.map(String) : [], toolName: "reasonix.record_observation", metadata: { source: "reasonix-plugin", client: "reasonix" } },
        budget: FAST_BUDGET,
      });
      return { content: res.ok ? "Observation recorded." : `[hypernexus] record_observation failed: ${res.error}`, isError: !res.ok };
    }
    case "tool_search": {
      const res = await kernel(`/api/tools/search?query=${encodeURIComponent(String(a.query))}&limit=${Math.min(25, Number(a.limit) || 10)}`, { budget: FAST_BUDGET });
      const rows = asList(unwrap(res));
      if (!rows.length) return { content: "No tools matched." };
      return {
        content: rows.map((t) => {
          const r = recOf(t) || {};
          return `- ${String(r.name ?? r.id ?? r.tool ?? "?")}${r.server ? ` (${r.server})` : ""}: ${clamp(String(r.description ?? ""), 160)}`;
        }).join("\n"),
      };
    }
    case "tool_discover": {
      const res = await kernel(`/api/mcp/native/search?query=${encodeURIComponent(clamp(String(a.query), 160))}&limit=${Math.min(25, Number(a.limit) || 10)}`, { budget: FAST_BUDGET });
      return { content: JSON.stringify(unwrap(res) ?? res.error, null, 2) };
    }
    case "suggest_tools": {
      const list = await getSuggestions();
      if (!list.length) return { content: "No suggestions yet — they appear as the conversation progresses." };
      return { content: list.slice(0, 10).map((s) => `- ${s?.name ?? s?.tool ?? s?.id ?? "?"}: ${clamp(String(s?.reason ?? s?.description ?? ""), 180)}`).join("\n") };
    }
    case "mcp_status": {
      const res = await kernel("/api/mcp/status", { budget: FAST_BUDGET });
      return { content: JSON.stringify(unwrap(res) ?? res.error, null, 2) };
    }
    case "mcp_servers": {
      const [runtime, configured] = await Promise.all([
        kernel("/api/mcp/servers", { budget: FAST_BUDGET }),
        kernel("/api/mcp/servers/configured", { budget: FAST_BUDGET }),
      ]);
      return { content: JSON.stringify({ runtime: unwrap(runtime), configured: unwrap(configured) }, null, 2) };
    }
    case "mcp_tools": {
      const res = await kernel("/api/mcp/tools", { budget: FAST_BUDGET });
      const rows = asList(unwrap(res)).slice(0, Math.min(100, Number(a.limit) || 25));
      return { content: rows.map((t) => { const r = recOf(t) || {}; return `- ${String(r.name ?? r.id ?? "?")}: ${clamp(String(r.description ?? ""), 140)}`; }).join("\n") || "No MCP tools registered." };
    }
    case "mcp_search": {
      const res = await kernel(`/api/mcp/tools/search?query=${encodeURIComponent(String(a.query))}&limit=${Math.min(25, Number(a.limit) || 10)}`, { budget: FAST_BUDGET });
      return { content: JSON.stringify(unwrap(res) ?? res.error, null, 2) };
    }
    case "mcp_call": {
      const res = await kernel("/api/agent/tool", { method: "POST", body: { name: String(a.tool), args: a.args && typeof a.args === "object" ? a.args : {} }, budget: CALL_BUDGET });
      return { content: JSON.stringify(unwrap(res) ?? { error: res.error, raw: res.data }, null, 2), isError: !res.ok };
    }
    case "session_search": {
      const res = await kernel(`/api/sessions/imported/list?limit=50`, { budget: FAST_BUDGET });
      const rows = asList(unwrap(res));
      const needle = String(a.query).toLowerCase();
      const matched = rows.filter((s) => JSON.stringify(recOf(s)).toLowerCase().includes(needle)).slice(0, Math.min(25, Number(a.limit) || 10));
      if (!matched.length) return { content: "No imported sessions matched." };
      return { content: matched.map((s) => { const r = recOf(s) || {}; return `- ${String(r.id ?? r.session_id ?? r.path ?? "?")}: ${clamp(String(r.summary ?? r.title ?? r.firstPrompt ?? "").replace(/\s+/g, " "), 180)}`; }).join("\n") };
    }
    case "session_context": {
      const [boot, links] = await Promise.all([
        kernel("/api/memory/session-bootstrap", { budget: FAST_BUDGET }),
        kernel("/api/memory/cross-session-links", { method: "POST", body: { limit: 8 }, budget: FAST_BUDGET }),
      ]);
      return { content: JSON.stringify({ bootstrap: unwrap(boot), crossSessionLinks: unwrap(links) }, null, 2) };
    }
    case "session_handoff": {
      if (a.action === "pickup") {
        const res = await kernel("/api/agent-memory/pickup", { method: "POST", body: a.artifact ? { artifact: String(a.artifact) } : {}, budget: FAST_BUDGET });
        return { content: JSON.stringify(unwrap(res) ?? { error: res.error }, null, 2) };
      }
      const res = await kernel("/api/agent-memory/handoff", { method: "POST", body: { summary: String(a.summary ?? ""), content: String(a.summary ?? ""), client: "reasonix", metadata: { source: "reasonix-plugin" } }, budget: FAST_BUDGET });
      return { content: res.ok ? "Handoff stored." : `[hypernexus] handoff failed: ${res.error}`, isError: !res.ok };
    }
    case "skill_search": {
      const res = await kernel(`/api/skills/search?q=${encodeURIComponent(String(a.query))}&limit=${Math.min(25, Number(a.limit) || 8)}`, { budget: FAST_BUDGET });
      const rows = asList(unwrap(res));
      if (!rows.length) return { content: "No skills matched." };
      return { content: rows.map((s) => { const r = recOf(s) || {}; return `- ${String(r.name ?? r.id ?? "?")}: ${clamp(String(r.description ?? r.summary ?? ""), 160)}`; }).join("\n") };
    }
    case "skill_manage": {
      if (a.action === "read") {
        const res = await kernel(`/api/skills/read?name=${encodeURIComponent(String(a.name || ""))}`, { budget: FAST_BUDGET });
        const data = unwrap(res) ?? res.error;
        return { content: typeof data === "string" ? data : JSON.stringify(data, null, 2) };
      }
      if (a.action === "create") {
        const res = await kernel("/api/skills/create", { method: "POST", body: { name: String(a.name || "unnamed"), content: String(a.content || "") }, budget: FAST_BUDGET });
        return { content: res.ok ? "Skill created." : `[hypernexus] skill_create failed: ${res.error}`, isError: !res.ok };
      }
      const res = await kernel("/api/skills", { budget: FAST_BUDGET });
      const rows = asList(unwrap(res));
      return { content: rows.map((s) => { const r = recOf(s) || {}; return `- ${String(r.name ?? r.id ?? "?")}`; }).join("\n") || "No skills registered." };
    }
    case "code_search": {
      const m = String(a.mode || "symbols");
      const res = await kernel(`/api/mcp/native/search?query=${encodeURIComponent(`${m} ${clamp(String(a.query), 160)}`)}&limit=${Math.min(25, Number(a.limit) || 10)}`, { budget: FAST_BUDGET });
      return { content: JSON.stringify(unwrap(res) ?? res.error, null, 2) };
    }
    case "knowledge_graph": {
      const [graph, relations] = await Promise.all([
        kernel(`/api/memory/graph?limit=100`, { budget: FAST_BUDGET }),
        kernel(`/api/memory/relations/graph${a.focus ? `?id=${encodeURIComponent(String(a.focus))}` : ""}`, { budget: FAST_BUDGET }),
      ]);
      return { content: JSON.stringify({ graph: unwrap(graph), relations: unwrap(relations) }, null, 2) };
    }
    case "billing_status": {
      const [status, chain, depleted] = await Promise.all([
        kernel("/api/billing/status", { budget: FAST_BUDGET }),
        kernel("/api/billing/fallback-chain", { budget: FAST_BUDGET }),
        kernel("/api/billing/depleted-models", { budget: FAST_BUDGET }),
      ]);
      return { content: JSON.stringify({ status: unwrap(status), fallbackChain: unwrap(chain), depleted: unwrap(depleted) }, null, 2) };
    }
    case "audit_log": {
      audit({ type: "progress", title: `audit:${a.action}`, content: `${a.action} → ${a.target}${a.result ? `: ${a.result}` : ""}`, toolName: "reasonix.audit_log", metadata: { action: a.action, target: a.target, result: a.result } });
      return { content: "Audit entry queued." };
    }
    case "subagent": {
      const content = `[SUBAGENT TASK] ${a.task}${a.context ? `\n\nContext: ${a.context}` : ""}`;
      const res = await kernel("/api/memory/add", { method: "POST", body: { content, category: "subagent", tags: ["client:reasonix", "subagent"] }, budget: FAST_BUDGET });
      return { content: res.ok ? "Sub-task dispatched to HyperNexus orchestration (tracked in L2 under category 'subagent')." : `[hypernexus] dispatch failed: ${res.error}`, isError: !res.ok };
    }
    case "workflow": {
      if (a.action === "run") {
        if (!a.id) return { content: "Usage: workflow {action:'run', id:'<workflow-id>'} — id is required.", isError: true };
        const res = await kernel(`/api/workflows/${encodeURIComponent(String(a.id))}/run`, { method: "POST", body: {}, budget: CALL_BUDGET });
        return { content: JSON.stringify(unwrap(res) ?? { error: res.error, raw: res.data }, null, 2).slice(0, 1500), isError: !res.ok };
      }
      const res = await kernel("/api/workflows", { budget: FAST_BUDGET });
      const body = unwrap(res);
      const wfs = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      const items = (Array.isArray(wfs) ? wfs : []).map((w, i) => `  ${i + 1}. ${w.id ?? w.name ?? "?"} - ${String(w.description ?? "").slice(0, 80)}`).join("\n");
      return { content: `Workflows:\n${items || "(none)"}` };
    }
    case "orchestrate": {
      const t = String(a.task || "").trim();
      if (!t) return { content: "Provide a task.", isError: true };
      const q = encodeURIComponent(clamp(t, 160));
      const recall = await kernel(`/api/memory/search?query=${q}&limit=3`, { budget: SLOW_BUDGET });
      const discover = await kernel(`/api/tools/search?query=${q}&limit=3`, { budget: SLOW_BUDGET });
      const persist = await kernel("/api/memory/facts/add", { method: "POST", body: { title: `orchestrated: ${clamp(t, 80)}`, content: `[ORCHESTRATED] ${t}`, tags: ["system:orchestrated", "client:reasonix"], namespace: "project" }, budget: FAST_BUDGET });
      const steps = [`RECALL: ${JSON.stringify(unwrap(recall)).slice(0, 240)}`, `DISCOVER: ${JSON.stringify(unwrap(discover)).slice(0, 240)}`, `PERSIST: ${persist.ok ? "task recorded in L2" : `failed (${persist.error})`}`, "EXECUTE: perform the task using the discovered tools above."];
      return { content: `Orchestrated "${t}":\n\n${steps.join("\n\n")}` };
    }
    case "browser": {
      if (a.action === "scrape") {
        if (!a.url) return { content: "Usage: browser {action:'scrape', url:'https://...'} — url is required.", isError: true };
        const res = await kernel("/api/browser/scrape", { method: "POST", body: { url: String(a.url) }, budget: CALL_BUDGET });
        if (!res.ok) return { content: `Browser scrape unavailable (${res.error ?? `HTTP ${res.status}`}) — the browser service may not be running.` };
        return { content: JSON.stringify(unwrap(res) ?? res.data, null, 2).slice(0, 3000) };
      }
      const res = await kernel("/api/browser/status", { budget: FAST_BUDGET });
      return { content: res.ok ? JSON.stringify(unwrap(res) ?? res.data, null, 2).slice(0, 500) : `Browser service not running (${res.error ?? `HTTP ${res.status}`}). Start it to enable scraping.` };
    }
    case "memory_stats": {
      const res = await kernel("/api/agent-memory/stats", { budget: FAST_BUDGET });
      if (!res.ok) return { content: `[hypernexus] memory_stats failed: ${res.error}`, isError: true };
      return { content: JSON.stringify(unwrap(res) ?? res.data, null, 2).slice(0, 1200) };
    }
    case "session_list": {
      const n = Math.min(50, Number(a.limit) || 10);
      const res = await kernel(`/api/sessions/summary?limit=${n}`, { budget: FAST_BUDGET });
      if (!res.ok) return { content: `[hypernexus] session_list failed: ${res.error}`, isError: true };
      return { content: JSON.stringify(unwrap(res) ?? res.data, null, 2).slice(0, 2000) };
    }
    case "repomap": {
      const res = await kernel("/api/agent/tool", { method: "POST", body: { name: "repomap", args: { dir: String(a.dir ?? "") } }, budget: CALL_BUDGET });
      if (!res.ok) return { content: `[hypernexus] repomap failed: ${res.error}`, isError: true };
      return { content: JSON.stringify(unwrap(res) ?? res.data, null, 2).slice(0, 3000) };
    }
    default:
      return { content: `[hypernexus] unknown tool: ${name}`, isError: true };
  }
}

const TOOL_NAMES = ["status","system_overview","memory_store","memory_search","memory_fts_search","memory_vector_search","memory_list","memory_delete","memory_relate","scratchpad","context_harvest","record_observation","tool_search","tool_discover","suggest_tools","mcp_status","mcp_servers","mcp_tools","mcp_search","mcp_call","session_search","session_context","session_handoff","skill_search","skill_manage","code_search","knowledge_graph","billing_status","audit_log","subagent","workflow","orchestrate","browser","memory_stats","session_list","repomap"];

// ── intercept handling ───────────────────────────────────────────────────────

function getText(params) {
  return String(params?.text ?? params?.prompt?.text ?? params?.prompt ?? params?.input?.text ?? "");
}

async function handleIntercept(params) {
  const point = String(params?.event ?? params?.point ?? params?.hook ?? params?.name ?? "");
  const toolName = String(params?.tool ?? params?.toolName ?? params?.tool_name ?? "");
  const toolInput = params?.input ?? params?.toolInput ?? params?.toolArgs ?? params?.arguments ?? {};

  // input.receive — @memory: expansion + suggestion feed
  if (/input/i.test(point) && !/tool/i.test(point)) {
    const deadline = Date.now() + HOOK_BUDGET;
    let text = getText(params);
    if (/@memory:/.test(text)) {
      const expanded = await expandMemoryRefs(text, deadline);
      if (expanded !== text) return { decision: "replace", text: expanded };
    }
    if (text.length >= 12) feedSuggestions("user", text);
    return { decision: "continue" };
  }

  // context.prepare / system_prompt.build / agent.before_start — inject fast block
  if (/context|system_prompt|before_start|session\.start/i.test(point)) {
    const lastUser = getText(params) || String(params?.lastUserText ?? "");
    const block = await buildSystemBlock(lastUser);
    if (!block) return { decision: "continue" };
    return { decision: "continue", context: [{ label: "hypernexus", text: block }] };
  }

  // compaction.prepare — guidance text
  if (/compaction/i.test(point)) {
    return {
      decision: "continue",
      context: [{ label: "hypernexus", text: "When summarizing: preserve hypernexus memory facts, key file paths, decisions, and unresolved goals. Cross-session knowledge lives in HyperNexus L2 memory." }],
    };
  }

  // tool.before — RBAC gate
  if (/tool\.before/i.test(point)) {
    const hit = dangerousMatch(`${toolName} ${JSON.stringify(toolInput ?? {})}`);
    if (hit && rbacMode() !== "audit") {
      audit({ type: "warning", title: `rbac-${rbacMode()}:${toolName}`, content: `dangerous pattern: ${hit}`, toolName });
      if (rbacMode() === "deny") return { decision: "block", reason: `HyperNexus RBAC (deny): destructive pattern matched (${hit}).` };
      return { decision: "continue", note: `HyperNexus RBAC (ask): destructive pattern matched (${hit}) — confirm with the user.` };
    }
    return { decision: "continue" };
  }

  // tool.after — audit + auto-store + file observations
  if (/tool\.after/i.test(point)) {
    try {
      if (!toolName.startsWith("ext__hypernexus__") && !toolName.startsWith("hypernexus_")) {
        const captured = captureFileObservation(toolName, toolInput);
        if (!captured) audit({ type: "progress", title: `tool:${toolName}`, content: `${toolName} ${params?.status ?? "done"}`, toolName, metadata: { status: params?.status ?? "done" } });
        const resultText = typeof params?.result === "string" ? params.result : JSON.stringify(params?.result ?? params?.output ?? "");
        autoStoreResult(toolName, resultText);
      }
    } catch { /* ignore */ }
    return { decision: "continue" };
  }

  // permission.decision — kernel-aware RBAC
  if (/permission/i.test(point)) {
    const mode = rbacMode();
    if (mode === "audit") return { decision: "continue" };
    const hit = dangerousMatch(`${params?.action ?? toolName} ${JSON.stringify(params?.resources ?? toolInput ?? {})}`);
    if (!hit) return { decision: "continue" };
    audit({ type: "warning", title: `rbac-${mode}:${toolName}`, content: `dangerous action matched (${hit})`, toolName });
    if (mode === "deny") return { decision: "deny", reason: `HyperNexus RBAC (deny): destructive pattern matched (${hit}).` };
    return { decision: "continue", note: `HyperNexus RBAC (ask): confirm destructive pattern (${hit}).` };
  }

  // session.end — flush audit + store turn note
  if (/session\.(end|save|rotate)/i.test(point)) {
    audit({ type: "progress", title: "session-end", content: "reasonix session ended; audit flushed", toolName: "reasonix.session" });
    void flushAudit();
    return { decision: "continue" };
  }

  return { decision: "continue" };
}

function handleEvent(params) {
  try {
    const point = String(params?.event ?? params?.point ?? params?.hook ?? "");
    const toolName = String(params?.tool ?? params?.toolName ?? "");
    if (/tool/i.test(point) && toolName && !toolName.startsWith("ext__hypernexus__")) {
      audit({ type: "progress", title: `tool:${toolName}`, content: `${toolName} observed`, toolName });
    }
    const text = getText(params);
    if (text.length >= 12 && /input|prompt|message/i.test(point)) feedSuggestions("user", text);
  } catch { /* ignore */ }
}

// ── JSON-RPC NDJSON transport ────────────────────────────────────────────────

let buf = "";
let initialized = false;

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function replyOk(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function replyErr(id, code, message, data) {
  send({ jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined ? { data } : {}) } });
}

async function onMessage(msg) {
  const id = msg?.id;
  const method = String(msg?.method ?? "");
  const params = msg?.params && typeof msg.params === "object" ? msg.params : {};

  try {
    if (method === "extension/initialize") {
      replyOk(id, {
        protocolVersion: 2,
        tools: TOOL_NAMES,
        intercepts: ["input.receive", "context.prepare", "tool.before", "tool.after", "permission.decision", "session.start", "session.end", "compaction.prepare", "system_prompt.build", "agent.before_start"],
        replaces: [],
        providers: [],
        version: VERSION,
      });
      return;
    }
    if (method === "extension/initialized") {
      initialized = true;
      try {
        const health = await kernel("/health", { budget: FAST_BUDGET });
        process.stderr.write(`[hypernexus] reasonix sidecar v${VERSION} ready — kernel ${health.ok ? `v${health.data?.version} online` : "unreachable"}\n`);
      } catch { /* ignore */ }
      return; // notification: no reply
    }
    if (method === "extension/shutdown") {
      try {
        await flushAudit();
      } catch { /* ignore */ }
      replyOk(id, { ok: true });
      process.exit(0);
    }
    if (method === "extension/intercept") {
      const out = await handleIntercept(params);
      replyOk(id, out);
      return;
    }
    if (method === "extension/event") {
      handleEvent(params);
      return; // notification
    }
    if (method === "extension/tool/call") {
      const name = String(params?.name ?? params?.tool ?? "");
      const args = params?.arguments ?? params?.args ?? params?.input ?? {};
      if (!TOOL_NAMES.includes(name)) {
        replyErr(id, -32000, `capability_not_declared: unknown tool ${name}`);
        return;
      }
      try {
        const out = await runTool(name, args);
        replyOk(id, { content: out.content, isError: !!out.isError, ...(out.extra ? { metadata: out.extra } : {}) });
      } catch (err) {
        replyErr(id, -32000, `tool failed: ${String(err?.message || err)}`);
      }
      return;
    }
    if (method === "extension/provider/catalog") {
      replyOk(id, { providers: [] });
      return;
    }
    // Unknown methods: tolerant null result (never break the host).
    if (id !== undefined && id !== null) replyOk(id, { ok: true, note: `unhandled method ${method}` });
  } catch (err) {
    if (id !== undefined && id !== null) replyErr(id, -32000, String(err?.message || err));
  }
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    const msg = tryJson(line);
    if (!msg) continue;
    void onMessage(msg);
  }
});

// Local smoke: `node hypernexus-reasonix.mjs --check` exercises the kernel without a host.
if (process.argv.includes("--check")) {
  const st = await getStatus();
  const mem = await kernel("/api/memory/fts-search?q=hypernexus&limit=1", { budget: FAST_BUDGET });
  console.log(JSON.stringify({ ok: st.ok, version: st.version, mcp: st.mcp, ftsOk: !!mem.ok, tools: TOOL_NAMES.length }, null, 2));
  process.exit(st.ok ? 0 : 1);
}
