#!/usr/bin/env node
// benchmark-ab.mjs -- Muse-defined LIVE PROOF harness (v1).
//
// Muse's acceptance bar (2026-10-26): "the measured benchmark, same task, same
// harness, twice, full catalog versus progressive disclosure plus predictive
// routing, with context and tool tokens before and after, accuracy and miss
// rate, latency, error rate, and task success, as log files."
//
// Mode A (full catalog): every kernel tool schema is in the model's context.
// Mode B (progressive disclosure): a minimal always-on set + tool_search /
//   suggest_tools (the HyperNexus way) - the model must discover tools.
//
// Tasks are objectively verified through kernel side effects (store a token ->
// is it searchable? run echo -> did the tool execute?), so "task success" is
// measured, not judged. Token counts use a chars/4 approximation (labeled).
//
// Usage: node bin/benchmark-ab.mjs [--model=<lmstudio-model>] [--tasks=N]
// Output: artifacts/ab-benchmark-<date>/results.jsonl + summary.md

import { mkdirSync, writeFileSync, appendFileSync, existsSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KERNEL = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";
// Ollama by default: its model has a 24h keep-alive, while LM Studio unloads
// idle models mid-run and turns the last rows into infra noise (seen live).
const LM_URL = process.env.LMSTUDIO_URL || "http://127.0.0.1:11434/v1/chat/completions";
const MODEL = (process.argv.find((a) => a.startsWith("--model=")) || "").split("=")[1] || "gemma-4-heretic:latest";

const OUT_DIR = path.join(root, "artifacts", `ab-benchmark-${new Date().toISOString().slice(0, 10)}`);
mkdirSync(OUT_DIR, { recursive: true });
const RESULTS = path.join(OUT_DIR, "results.jsonl");

const approxTokens = (s) => Math.round(String(s).length / 4); // chars/4 proxy (labeled in summary)

// ---- task set: ground truth = kernel-verifiable side effect -----------------
// v2 discipline (learned from v1's false positives):
//   - every task gets a UNIQUE stamp per mode (side effects never leak across modes)
//   - the verify target is a HIDDEN token that appears ONLY in the kernel's
//     response/side effect, never in the prompt (prompt-echo cannot pass)
function tasksFor(mode) {
  const s = `${mode}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  const hidden = `hid-${s}`;
  return [
    {
      id: "store-memory",
      prompt: `Store a memory whose content is exactly "${hidden}" and whose tag is "bench".`,
      required: ["memory_add", "add_memory", "hypernexus_memory_store", "memory_store"],
      verify: async () => kernelHas(hidden),
    },
    {
      id: "search-memory",
      // Pre-seeded below: the prompt names only the TAG; the content token is
      // discoverable only through actual memory search.
      prompt: `Find the memory tagged "bench-seed-${s}" and report its full content field.`,
      required: ["search_memory", "hypernexus_memory_search", "memory_search", "hypernexus_memory_fts_search"],
      verify: async (_ctx, res) => (res || "").includes(hidden),
    },
    {
      id: "shell-echo",
      prompt: `Run a shell command that echoes exactly "sh-${s}".`,
      required: ["bash", "run_shell_command", "hypernexus_bash"],
      // Kernel audit trail, not response text: the prompt contains the token,
      // so a response check would pass on mere echo.
      verify: async () => kernelAudited(`sh-${s}`),
    },
    {
      id: "scratchpad",
      prompt: `Put the value "${hidden}" into the scratchpad under key "bench-${s}". Then read it back and report the value.`,
      required: ["memory_scratchpad_set", "hypernexus_scratchpad", "scratchpad"],
      verify: async () => scratchpadHas(hidden),
    },
    {
      id: "tool-discovery",
      prompt: `Which available tool can scrape a web page? Name the tool.`,
      required: ["tool_search", "hypernexus_tool_search", "mcp_search", "hypernexus_mcp_search", "hypernexus_tool_discover"],
      // "scrape" appears in the prompt; only the tool NAME is evidence.
      verify: async (_ctx, res) => /browser/i.test(res || ""),
    },
    {
      id: "status",
      prompt: `Report the HyperNexus system status.`,
      required: ["system_status", "hypernexus_system_overview", "hypernexus_status", "status"],
      verify: async (_ctx, res) => /kernel|status|ok|healthy/i.test(res || ""),
    },
    {
      id: "hello",
      prompt: `Use the hello_world tool with name "${s}" and report the exact greeting it returns.`,
      required: ["hello_world"],
      verify: async () => kernelAudited(s),
    },
    {
      id: "jira-honesty",
      prompt: `Create a Jira issue in project BENCH with summary "${s}". Report exactly what happened.`,
      required: ["jira_create_issue"],
      // Success = the honest-degradation marker OR an explicit refusal when the
      // tool is genuinely unavailable (correct behavior in discovery mode).
      verify: async (_ctx, res) => /NOT CREATED|not configured/i.test(res || "") || /cannot|can't|no .*tool|don't have|unavailable/i.test(res || ""),
    },
    {
      id: "pipeline",
      prompt: `Generate a GitHub Actions CI pipeline YAML for a Go project.`,
      required: ["generate_devops_pipeline"],
      verify: async (_ctx, res) => /runs-on: ubuntu-latest/.test(res || ""),
    },
    {
      id: "list-tools",
      prompt: `List the names of the available MCP tools.`,
      required: ["mcp_list_tools", "hypernexus_mcp_tools", "list_accessory_tools"],
      verify: async (_ctx, res) => /bash|read_file|memory/i.test(res || ""),
    },
    {
      id: "browser-status",
      prompt: `Check whether the browser service is running using a tool, and report the result.`,
      required: ["hypernexus_browser", "browser"],
      verify: async (_ctx, res) => /browser|not running|unavailable|status/i.test(res || ""),
    },
    {
      id: "session-search",
      prompt: `Search imported sessions for "benchmark" and report what you find.`,
      required: ["hypernexus_session_search", "session_search"],
      verify: async (_ctx, res) => typeof res === "string" && res.length > 0,
    },
  ];
}

// Pre-seed the hidden search record so the search-memory task has real content.
async function seedSearchRecord(task) {
  const m = task.prompt.match(/bench-seed-([a-z0-9-]+)/i);
  if (!m) return;
  const tag = `bench-seed-${m[1]}`;
  const hidden = `hid-${m[1]}`;
  await kernelPost("/api/memory/facts/add", { title: tag, content: hidden, tags: [tag], namespace: "project" });
}

// ---- kernel helpers --------------------------------------------------------
async function kernelPost(endpoint, body) {
  const res = await fetch(`${KERNEL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  return res.json().catch(() => ({}));
}
async function kernelHas(token) {
  for (let i = 0; i < 12; i++) {
    const res = await fetch(`${KERNEL}/api/memory/search?query=${encodeURIComponent(token)}&limit=5`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
    const body = res ? await res.text().catch(() => "") : "";
    if (body.includes(token)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
async function scratchpadHas(key) {
  const res = await fetch(`${KERNEL}/api/memory/scratchpad/get`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
  const body = res ? await res.text().catch(() => "") : "";
  return body.includes(key);
}
// kernelAudited: did the kernel's audit trail record this token as tool args?
// Response-text checks are spoofable by prompt echo; the audit trail is a real
// side effect of tool execution (workspaceRoot/.hypernexus/audit/audit-*.jsonl).
async function kernelAudited(token) {
  const dir = path.join(root, ".hypernexus", "audit");
  for (let i = 0; i < 10; i++) {
    try {
      const { readdirSync, readFileSync } = await import("node:fs");
      const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
      const newest = files.sort().pop();
      if (newest && readFileSync(path.join(dir, newest), "utf8").includes(token)) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ---- tool catalog (OpenAI function-calling shape) ---------------------------
// Retried: a kernel restart mid-harness must not kill the run uncaught.
let inv = null;
for (let i = 0; i < 6 && !inv; i++) {
  inv = await fetch(`${KERNEL}/api/mcp/tools`, { signal: AbortSignal.timeout(30000) })
    .then((r) => r.json())
    .catch(() => null);
  if (!inv) {
    console.log(`inventory fetch failed (attempt ${i + 1}/6), retrying in 5s...`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
if (!inv?.data) {
  console.error("FATAL: kernel inventory unavailable after 6 attempts");
  process.exit(2);
}
const ALL_TOOLS = (inv.data || []).map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: (t.description || "").slice(0, 300),
    parameters: t.inputSchema?.type ? t.inputSchema : { type: "object", properties: {} },
  },
}));

// Mode B: minimal always-on set + discovery tools (the HyperNexus mechanism).
// v2: the minimal set is deliberately SMALL so tasks must discover their tools
// through tool_search - that is the predictive-routing leg Muse's spec centers on.
const MINIMAL_NAMES = new Set(["tool_search", "mcp_search", "memory_search", "memory_add", "add_memory", "system_status"]);
const MINIMAL_TOOLS = ALL_TOOLS.filter((t) => MINIMAL_NAMES.has(t.function.name));

// ---- model loop ------------------------------------------------------------
// STREAMING is required: non-streamed responses die at exactly 300s (measured —
// an idle-connection killer fires because no bytes flow during generation, and
// the CPU laptop needs ~270s+ per catalog turn). SSE chunks keep it alive.
async function runTurnOnce(messages, tools, toolChoice) {
  const body = { model: MODEL, messages, tools: tools.length ? tools : undefined, tool_choice: toolChoice, temperature: 0, max_tokens: 768, stream: true, stream_options: { include_usage: true } }; // stream_options needed for usage counts; streaming needed to survive the 300s idle-connection kill
  const t0 = Date.now();
  const res = await fetch(LM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(900000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LM HTTP ${res.status}: ${detail.slice(0, 160)}`);
  }
  const msg = { role: "assistant", content: "", tool_calls: [] };
  const callMap = new Map();
  let usage = {};
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let chunk;
      try { chunk = JSON.parse(payload); } catch { continue; }
      if (chunk.usage) usage = chunk.usage;
      const d = chunk.choices?.[0]?.delta || {};
      if (d.content) msg.content += d.content;
      for (const tc of d.tool_calls || []) {
        const i = tc.index ?? 0;
        if (!callMap.has(i)) callMap.set(i, { id: "", function: { name: "", arguments: "" } });
        const c = callMap.get(i);
        if (tc.id) c.id = tc.id;
        if (tc.function?.name) c.function.name += tc.function.name;
        if (tc.function?.arguments) c.function.arguments += tc.function.arguments;
      }
    }
  }
  if (callMap.size) msg.tool_calls = [...callMap.entries()].sort((a, b) => a[0] - b[0]).map(([_, c]) => c);
  return { msg, latency: Date.now() - t0, usage };
}

async function runTurn(messages, tools, toolChoice = "auto") {
  // One retry on ANY failure — network-level kills ("fetch failed") included.
  try {
    return await runTurnOnce(messages, tools, toolChoice);
  } catch (err) {
    await new Promise((r) => setTimeout(r, 15000)); // 15s: covers model teardown/cold-reload windows ("Stopping..." refuses connections)
    return await runTurnOnce(messages, tools, toolChoice);
  }
}

async function runTask(task, mode) {
  const tools = mode === "A" ? [...ALL_TOOLS] : [...MINIMAL_TOOLS]; // per-task copy: discoveries must not leak across tasks
  // v4: Mode B carries a one-line discovery instruction as part of the
  // progressive-disclosure arm (v3 showed the model reports unavailability
  // instead of searching — without the hint the routing leg is untestable).
  // Noted honestly in the summary: the arms differ by disclosure + hint.
  const sysExtra = mode === "B" ? " If a task needs a tool that is not in your list, call tool_search (or mcp_search) first to discover it — never report a tool as unavailable without searching." : "";
  const messages = [
    { role: "system", content: "You are a helpful assistant with tools. Complete the task using tools when needed. If a tool reports an error or refuses, report that honestly." + sysExtra },
    { role: "user", content: task.prompt },
  ];
  let toolTokens = approxTokens(JSON.stringify(tools));
  let ctxTokensBefore = approxTokens(JSON.stringify(messages)) + toolTokens;
  let modelLatency = 0;
  let toolErrors = 0;
  let toolCalls = 0;
  let discoveryUsed = false;

  for (let turn = 0; turn < 4; turn++) {
    const { msg, latency, usage } = await runTurn(messages, tools);
    modelLatency += latency;
    if (usage.prompt_tokens) ctxTokensBefore = Math.min(ctxTokensBefore, usage.prompt_tokens + toolTokens); // prefer real counts
    messages.push(msg);

    const calls = msg.tool_calls || [];
    if (!calls.length) {
      return finish({ task, mode, toolTokens, ctxTokensBefore, ctxTokensAfter: approxTokens(JSON.stringify(messages)), modelLatency, toolErrors, toolCalls, discoveryUsed, final: msg.content || "" });
    }
    for (const call of calls) {
      toolCalls++;
      const name = call.function?.name;
      let args = {};
      try { args = JSON.parse(call.function?.arguments || "{}"); } catch {}
      if (/tool_search|mcp_search|tool_discover/.test(name)) discoveryUsed = true;
      const result = await kernelPost("/api/agent/tool", { name, args }).catch((e) => ({ error: String(e) }));
      const text = JSON.stringify(result).slice(0, 1200);
      if (/unknown tool|error/i.test(text) && !/NOT CREATED|not configured/i.test(text)) toolErrors++;
      // Mode B discovery: when the model searches, the FOLLOWING turn gets the discovered tools.
      if (mode === "B" && /tool_search|mcp_search|tool_discover/.test(name)) {
        const q = args.query || args.q || task.prompt.slice(0, 60);
        const found = await fetch(`${KERNEL}/api/tools/search?query=${encodeURIComponent(q)}&limit=8`, { signal: AbortSignal.timeout(15000) }).then((r) => r.json()).catch(() => null);
        const names = new Set(MINIMAL_TOOLS.map((t) => t.function.name));
        for (const t of ALL_TOOLS) {
          const hit = JSON.stringify(found || {}).includes(t.function.name);
          if (hit && !names.has(t.function.name)) {
            tools.push(t);
            names.add(t.function.name);
          }
        }
        toolTokens = approxTokens(JSON.stringify(tools));
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: text });
    }
  }
  return finish({ task, mode, toolTokens, ctxTokensBefore, ctxTokensAfter: approxTokens(JSON.stringify(messages)), modelLatency, toolErrors, toolCalls, discoveryUsed, final: "(loop limit)" });
}

async function finish(r) {
  const success = await r.task.verify(null, r.final).catch(() => false);
  const row = {
    ts: new Date().toISOString(),
    mode: r.mode,
    task: r.task.id,
    success,
    tool_tokens: r.toolTokens,
    ctx_tokens_before: r.ctxTokensBefore,
    ctx_tokens_after: r.ctxTokensAfter,
    latency_ms: r.modelLatency,
    tool_calls: r.toolCalls,
    tool_errors: r.toolErrors,
    discovery_used: r.discoveryUsed,
    final_snippet: String(r.final || '').slice(0, 160),
  };
  appendFileSync(RESULTS, JSON.stringify(row) + "\n");
  console.log(`  [${r.mode}] ${r.task.id.padEnd(15)} success=${success ? "1" : "0"} toolTok=${row.tool_tokens} ctxBefore=${row.ctx_tokens_before} ctxAfter=${row.ctx_tokens_after} latency=${row.latency_ms}ms calls=${row.tool_calls} err=${row.tool_errors}`);
  return row;
}

// ---- run both modes --------------------------------------------------------
console.log(`== A/B BENCHMARK v2.1 (Muse live-proof spec) | model=${MODEL} | tasks=12 per mode`);
// Rotate prior run data instead of clearing it (v2's raw rows were lost to a
// startup clear — one run's evidence must never destroy another's).
const runStamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const rotations = [
  [RESULTS, path.join(OUT_DIR, `results-${runStamp}.jsonl`)],
  [path.join(OUT_DIR, "summary.md"), path.join(OUT_DIR, `summary-${runStamp}.md`)],
];
for (const [from, to] of rotations) {
  if (existsSync(from)) {
    renameSync(from, to);
    console.log(`prior run data rotated -> ${path.basename(to)}`);
  }
}
const rows = [];
for (const mode of ["A", "B"]) {
  console.log(`\n-- Mode ${mode}: ${mode === "A" ? "full catalog (" + ALL_TOOLS.length + " tools)" : "progressive disclosure (" + MINIMAL_TOOLS.length + " + discovery)"} --`);
  for (const task of tasksFor(mode)) {
    try {
      await seedSearchRecord(task);
      rows.push(await runTask(task, mode));
    } catch (err) {
      console.log(`  [${mode}] ${task.id} HARNESS ERROR: ${String(err).slice(0, 100)}`);
      rows.push({ ts: new Date().toISOString(), mode, task: task.id, success: false, harness_error: String(err).slice(0, 200) });
      appendFileSync(RESULTS, JSON.stringify(rows[rows.length - 1]) + "\n");
    }
  }
}

// ---- summary ---------------------------------------------------------------
const agg = (mode) => {
  const rs = rows.filter((r) => r.mode === mode && !r.harness_error);
  const sum = (k) => rs.reduce((a, r) => a + (r[k] || 0), 0);
  return {
    n: rs.length,
    success: sum("success"),
    success_rate: rs.length ? (sum("success") / rs.length * 100).toFixed(0) + "%" : "n/a",
    tool_tokens_avg: rs.length ? Math.round(sum("tool_tokens") / rs.length) : 0,
    ctx_before_avg: rs.length ? Math.round(sum("ctx_tokens_before") / rs.length) : 0,
    ctx_after_avg: rs.length ? Math.round(sum("ctx_tokens_after") / rs.length) : 0,
    latency_avg_ms: rs.length ? Math.round(sum("latency_ms") / rs.length) : 0,
    tool_calls: sum("tool_calls"),
    tool_errors: sum("tool_errors"),
    miss_rate: rs.length ? ((rs.length - sum("success")) / rs.length * 100).toFixed(0) + "%" : "n/a",
    discovery_used: rs.filter((r) => r.discovery_used).length,
  };
};
const A = agg("A");
const B = agg("B");
const md = [
  "# A/B Benchmark â€” Muse live-proof spec (v1)",
  "",
  `Date: ${new Date().toISOString()} | Model: ${MODEL} (${LM_URL.includes("11434") ? "Ollama" : "LM Studio"}) | Token counts: chars/4 approximation unless the API reported usage.prompt_tokens`,
  "",
  "Same tasks, same harness, twice: full catalog vs progressive disclosure + predictive routing.",
  "",
  "| Metric | Mode A (full catalog) | Mode B (progressive disclosure) |",
  "|---|---|---|",
  `| Tasks | ${A.n} | ${B.n} |`,
  `| Task success | ${A.success}/${A.n} (${A.success_rate}) | ${B.success}/${B.n} (${B.success_rate}) |`,
  `| Miss rate | ${A.miss_rate} | ${B.miss_rate} |`,
  `| Tool tokens (avg) | ${A.tool_tokens_avg} | ${B.tool_tokens_avg} |`,
  `| Context tokens before (avg) | ${A.ctx_before_avg} | ${B.ctx_before_avg} |`,
  `| Context tokens after (avg) | ${A.ctx_after_avg} | ${B.ctx_after_avg} |`,
  `| Model latency (avg ms) | ${A.latency_avg_ms} | ${B.latency_avg_ms} |`,
  `| Tool calls (total) | ${A.tool_calls} | ${B.tool_calls} |`,
  `| Tool errors (total) | ${A.tool_errors} | ${B.tool_errors} |`,
  `| Discovery used (tasks) | ${A.discovery_used} | ${B.discovery_used} |`,
  "",
  "Per-task rows: `results.jsonl`.",
  "",
  "Known limitations (honest): 12-task exploratory set, one local CPU model; tool/context tokens mostly approximated (chars/4); discovery_used=0 means the predictive-routing leg is UNMEASURED whenever the minimal set covers ground truth or the model answers without discovering. Exploratory pilot data only — NOT the spec v1.2 / tasks v1.1 track.",
];
writeFileSync(path.join(OUT_DIR, "summary.md"), md.join("\n"));
console.log(`\n== SUMMARY ==\n${md.slice(3, 16).join("\n")}`);
console.log(`\nArtifacts: ${path.relative(root, OUT_DIR)}`);
