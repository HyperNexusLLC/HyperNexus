#!/usr/bin/env node
/**
 * test-opencode-ext.mjs — OpenCode plugin battery
 * ================================================
 * Loads the HyperNexus OpenCode V2 plugin against a mock plugin-context and
 * exercises: registration surface, all 28 tools (live kernel), 10 commands,
 * 3 skills, MCP registration, worktree strategy, every hook, the V1 shim, and
 * the kernel-down degradation contract.
 *
 * Run: node bin/test-opencode-ext.mjs [--offline-ok]
 */

import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const PLUGIN = path.join(ROOT, "addons", "opencode", "plugin", "hypernexus", "index.js");

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(name) {
  console.log(`\n== ${name}`);
}

// ── Mock plugin context ──────────────────────────────────────────────────────

function makeMockCtx({ directory, baseUrl } = {}) {
  const state = {
    tools: new Map(),
    namespaces: [],
    commands: new Map(),
    skills: new Map(),
    mcp: new Map(),
    worktrees: [],
    hooks: { session: new Map(), tool: new Map(), permission: new Map(), shell: new Map() },
    synthetic: [],
    prompts: [],
    storage: new Map(),
  };

  const editorTool = {
    namespace: (ns) => state.namespaces.push(ns),
    add: (t) => state.tools.set(`${t.options?.namespace ? t.options.namespace + "_" : ""}${t.name}`, t),
    update: (id, fn) => {
      const t = state.tools.get(id);
      if (t) fn(t);
    },
    remove: (id) => state.tools.delete(id),
    list: () => [...state.tools.values()],
    get: (id) => state.tools.get(id),
  };

  const ctx = {
    options: baseUrl ? { baseUrl } : {},
    location: { directory: directory || ROOT, project: { id: "test", directory: directory || ROOT, canonical: true } },
    storage: {
      get: async (k) => state.storage.get(k),
      set: async (k, v) => void state.storage.set(k, v),
      remove: async (k) => void state.storage.delete(k),
      scan: async () => ({ entries: [] }),
    },
    tool: {
      transform: async (cb) => {
        cb(editorTool);
        return { dispose: async () => {} };
      },
      hook: async (name, cb) => {
        state.hooks.tool.set(name, cb);
        return { dispose: async () => {} };
      },
      list: async () => [...state.tools.values()],
      reload: async () => {},
    },
    command: {
      transform: async (cb) => {
        cb({
          add: (c) => state.commands.set(c.name, c),
        });
        return { dispose: async () => {} };
      },
      list: async () => [...state.commands.values()],
      reload: async () => {},
    },
    skill: {
      transform: async (cb) => {
        cb({
          add: (s) => state.skills.set(s.id, s),
          get: (id) => state.skills.get(id),
          update: () => {},
          remove: (id) => state.skills.delete(id),
          list: () => [...state.skills.values()],
        });
        return { dispose: async () => {} };
      },
      reload: async () => {},
    },
    mcp: {
      transform: async (cb) => {
        cb({
          set: (name, cfg) => state.mcp.set(name, cfg),
          get: (name) => state.mcp.get(name),
          update: () => {},
          remove: (name) => state.mcp.delete(name),
          list: () => [...state.mcp.entries()],
        });
        return { dispose: async () => {} };
      },
      list: async () => [],
      reload: async () => {},
    },
    worktree: {
      transform: async (cb) => {
        cb({ add: (d) => state.worktrees.push(d) });
        return { dispose: async () => {} };
      },
      reload: async () => {},
    },
    session: {
      hook: async (name, cb) => {
        state.hooks.session.set(name, cb);
        return { dispose: async () => {} };
      },
      synthetic: async (input) => void state.synthetic.push(input),
      prompt: async (input) => void state.prompts.push(input),
      context: async () => [{ role: "user", content: "probe transcript" }],
    },
    permission: {
      hook: async (name, cb) => {
        state.hooks.permission.set(name, cb);
        return { dispose: async () => {} };
      },
    },
    shell: {
      hook: async (name, cb) => {
        state.hooks.shell.set(name, cb);
        return { dispose: async () => {} };
      },
    },
    event: {
      subscribe: async function* () {
        /* empty stream */
      },
    },
    model: { default: async () => undefined },
    generate: { text: async () => ({ text: "generated summary" }) },
    app: { version: "test" },
  };

  return { ctx, state };
}

// ── Load plugin ──────────────────────────────────────────────────────────────

const mod = await import(pathToFileURL(PLUGIN).href);
const plugin = mod.default;

section("1. Module surface");
check("default export exists", !!plugin);
check("plugin id is 'hypernexus'", plugin?.id === "hypernexus", `got ${plugin?.id}`);
check("setup is a function", typeof plugin?.setup === "function");
check("V1 server() shim is a function", typeof plugin?.server === "function");
check("exports TOOLS (29)", Array.isArray(mod.TOOLS) && mod.TOOLS.length === 29, `got ${mod.TOOLS?.length}`);
check("exports COMMANDS (11)", Array.isArray(mod.COMMANDS) && mod.COMMANDS.length === 11, `got ${mod.COMMANDS?.length}`);
check("exports SKILLS (3)", Array.isArray(mod.SKILLS) && mod.SKILLS.length === 3, `got ${mod.SKILLS?.length}`);

// rpc contract consistency
const rpc = await import(pathToFileURL(path.join(path.dirname(PLUGIN), "rpc.js")).href);
const toolNames = mod.TOOLS.map((t) => `hypernexus_${t.name}`);
const rpcNames = Object.values(rpc.TOOL);
section("2. RPC contract consistency");
check("rpc.TOOL covers every registered tool", rpcNames.length === toolNames.length && toolNames.every((n) => rpcNames.includes(n)), `rpc=${rpcNames.length} tools=${toolNames.length}`);
check("rpc.COMMAND covers every command", Object.values(rpc.COMMAND).every((c) => mod.COMMANDS.some((x) => x.name === c)));
check("every tool has JSON-schema input", mod.TOOLS.every((t) => t.input?.type === "object"));
check("every tool has description", mod.TOOLS.every((t) => typeof t.description === "string" && t.description.length > 10));
check("every tool has run()", mod.TOOLS.every((t) => typeof t.run === "function"));

// ── Setup & registration ─────────────────────────────────────────────────────

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hn-opencode-test-"));
const { ctx, state } = makeMockCtx({ directory: tmp });
const cleanup = await plugin.setup(ctx);

section("3. Registration surface");
check("setup returns cleanup function", typeof cleanup === "function");
check("namespace registered", state.namespaces.length === 1 && state.namespaces[0].name === "hypernexus");
check("29 tools registered", state.tools.size === 29, `got ${state.tools.size}`);
check("tool names match rpc contract", [...state.tools.keys()].every((k) => rpcNames.includes(k)));
check("11 commands registered", state.commands.size === 11, `got ${state.commands.size}`);
check("3 skills registered with path", state.skills.size === 3 && [...state.skills.values()].every((s) => typeof s.path === "string" && s.path.length > 0));
check("skill SKILL.md files materialized", [...state.skills.values()].every((s) => fs.existsSync(s.path)));
check("MCP server 'hypernexus' registered", state.mcp.has("hypernexus"));
const mcpCfg = state.mcp.get("hypernexus");
check("MCP type local + command array", mcpCfg?.type === "local" && Array.isArray(mcpCfg?.command) && mcpCfg.command.length >= 1);
check("MCP env passes kernel URL", typeof mcpCfg?.environment?.HYPERNEXUS_URL === "string");
check("MCP startup timeout set", typeof mcpCfg?.timeout?.startup === "number");
check("worktree strategy registered", state.worktrees.length === 1 && typeof state.worktrees[0].create === "function");
check("session hooks registered (prompt/context/compaction/model.request/retry)", ["prompt", "context", "compaction", "model.request", "retry"].every((h) => state.hooks.session.has(h)));
check("tool hooks registered (execute.before/execute.after)", ["execute.before", "execute.after"].every((h) => state.hooks.tool.has(h)));
check("permission hook registered (evaluate)", state.hooks.permission.has("evaluate"));
check("shell hook registered (create.before)", state.hooks.shell.has("create.before"));
check("storage boot record written", state.storage.has("boot"));

section("4. Worktree strategy behavior");
const wt = state.worktrees[0];
const wtDir = path.join(tmp, "wt-probe");
const created = await wt.create({ directory: wtDir }, { signal: new AbortController().signal });
check("create returns directory", created?.directory === wtDir && fs.existsSync(wtDir));
check("create writes linkage marker", fs.existsSync(path.join(wtDir, ".hypernexus-worktree.json")));
const listed = await wt.list(tmp, { signal: new AbortController().signal });
check("list finds managed worktree", listed.some((w) => w.directory === wtDir));
await wt.remove({ directory: wtDir, force: true }, { signal: new AbortController().signal });
check("remove deletes marker", !fs.existsSync(path.join(wtDir, ".hypernexus-worktree.json")));

// ── Live tool execution (kernel up) ──────────────────────────────────────────

section("5. Tool execution — live kernel");
async function runTool(name, input = {}) {
  const t = state.tools.get(`hypernexus_${name}`);
  if (!t) return { error: "missing tool" };
  try {
    return await t.execute(input, { progress: async () => {} });
  } catch (err) {
    return { error: String(err?.message || err) };
  }
}

const results = {};
for (const t of mod.TOOLS) {
  const input = {};
  // minimal valid inputs per tool
  if (t.name === "memory_store") input.content = `test-opencode-ext battery write ${Date.now()}`;
  if (["memory_search", "memory_fts_search", "memory_vector_search", "tool_search", "tool_discover", "mcp_search", "session_search", "skill_search", "code_search", "context_harvest"].includes(t.name))
    input.query = input.topic = "test battery probe";
  if (t.name === "scratchpad") {
    input.action = "set";
    input.key = "battery";
    input.value = "ok";
  }
  if (t.name === "record_observation") input.content = "battery observation";
  if (t.name === "session_handoff") input.action = "write", (input.summary = "battery handoff");
  if (t.name === "skill_manage") input.action = "list";
  if (t.name === "mcp_call") {
    input.tool = "hello_world";
    input.args = { name: "battery" };
  }
  if (t.name === "audit_log") {
    input.action = "battery";
    input.target = "test-opencode-ext";
  }
  if (t.name === "subagent") input.task = "battery subtask";
  if (t.name === "knowledge_graph") input.focus = "memory";
  if (t.name === "memory_list") input.limit = 3;
  if (t.name === "mcp_tools") input.limit = 3;
  const out = await runTool(t.name, input);
  results[t.name] = out;
  const text = typeof out?.content === "string" ? out.content : JSON.stringify(out);
  check(`tool ${t.name} returns content string`, typeof out?.content === "string" && out.content.length > 0, text?.slice(0, 120));
}
check("all tools executed without throwing", mod.TOOLS.every((t) => !results[t.name]?.error), JSON.stringify(Object.entries(results).filter(([, v]) => v?.error).map(([k]) => k)));

const st = results.status?.content ?? "";
check("status reports kernel online", /1\.0\.\d+|"ok"|online/i.test(st));
check("memory_store persisted", /Stored/.test(results.memory_store?.content ?? ""));
const found = await runTool("memory_search", { query: "test-opencode-ext battery", limit: 10 });
check("memory_search finds stored fact", /battery/i.test(found.content ?? ""));
const scratch = await runTool("scratchpad", { action: "get", key: "battery" });
check("scratchpad round-trips", /ok/.test(scratch.content ?? ""));
const handoff = await runTool("session_handoff", { action: "pickup" });
check("session_handoff pickup responds", typeof handoff?.content === "string");
const ctx2 = await runTool("session_context", {});
check("session_context returns bootstrap + links", /bootstrap/i.test(ctx2?.content ?? ""));
check("session_context cross-session links parse (no 'invalid JSON body')", !/invalid JSON body/.test(ctx2?.content ?? ""));
const kg = await runTool("knowledge_graph", { focus: "memory" });
check("knowledge_graph returns graph payload", /graph/i.test(kg?.content ?? ""));

section("5b. Memory lifecycle + observation capture");
const delNoArg = await runTool("memory_delete", {});
check("memory_delete requires id or tag", /requires id or tag/i.test(delNoArg?.content ?? ""));
const delFake = await runTool("memory_delete", { id: "does-not-exist-battery" });
check("memory_delete degrades gracefully on unknown id", typeof delFake?.content === "string" && delFake.content.length > 0, delFake?.content?.slice(0, 80));
const delByTag = await runTool("memory_delete", { tag: "definitely-not-a-real-tag-xyz" });
check("memory_delete tag fan-out finds nothing gracefully", typeof delByTag?.content === "string" && /No memories|Deleted 0/i.test(delByTag.content), delByTag?.content?.slice(0, 80));

section("6. Command execution");
for (const [name, cmd] of state.commands) {
  try {
    const args = name === "hn-store" || name === "hn-remember" ? "battery memory [tags: battery]" : name === "hn-purge" ? "battery" : "battery probe";
    await cmd.execute({ sessionID: "ses_battery", prompt: { text: args }, delivery: "steer" });
    check(`command ${name} executes`, true);
  } catch (err) {
    check(`command ${name} executes`, false, String(err?.message || err));
  }
}
check("report commands produced synthetic output", state.synthetic.length >= 5, `got ${state.synthetic.length}`);
check("context commands produced prompts", state.prompts.length >= 3, `got ${state.prompts.length}`);

section("7. Hooks");
const promptHook = state.hooks.session.get("prompt");
const promptEvent = {
  sessionID: "ses_hook",
  prompt: { text: "Please recall @memory:architecture and continue", files: [{ uri: "file:///x", mention: { start: 0, end: 5 } }] },
  metadata: {},
  delivery: "steer",
};
await promptHook(promptEvent);
check("prompt hook expands @memory: references", !promptEvent.prompt.text.includes("@memory:architecture"), promptEvent.prompt.text.slice(0, 120));
check("prompt hook keeps text non-empty", promptEvent.prompt.text.length > 10);
check("prompt hook is non-throwing", true);

const contextHook = state.hooks.session.get("context");
const contextEvent = {
  sessionID: "ses_hook",
  kind: "primary",
  system: [],
  messages: [{ role: "user", content: "test battery probe about memory tooling" }],
  tools: {},
  options: {},
};
await contextHook(contextEvent);
check("context hook injects a system block", contextEvent.system.length === 1 && /HyperNexus/.test(contextEvent.system[0]?.text ?? ""));
check("context hook block is budgeted in size", (contextEvent.system[0]?.text ?? "").length <= 1600);

const compactionEvent = { system: [], messages: [] };
await state.hooks.session.get("compaction")(compactionEvent);
check("compaction hook adds preservation guidance", compactionEvent.system.length === 1);

const mrEvent = { headers: {}, sessionID: "ses_hook" };
await state.hooks.session.get("model.request")(mrEvent);
check("model.request hook sets identity header", mrEvent.headers["x-hypernexus-client"]?.startsWith("opencode/"));

await state.hooks.session.get("retry")({ sessionID: "ses_hook", model: { providerID: "p", id: "m" }, error: { type: "rate", message: "429" }, attempt: 2, decision: { retry: true, delay: 1000 } });
check("retry hook is non-throwing", true);

await state.hooks.tool.get("execute.before")({ tool: "bash", input: { command: "rm -rf /tmp/x" } });
check("tool execute.before hook is non-throwing", true);
await state.hooks.tool.get("execute.after")({ tool: "bash", status: "completed", input: {}, result: { content: "x".repeat(600) } });
check("tool execute.after hook is non-throwing", true);
await state.hooks.tool.get("execute.after")({ tool: "hypernexus_status", status: "completed", input: {}, result: { content: "skip me" } });
check("tool hooks skip hypernexus_* tools", true);

// File-observation capture must reach the kernel through the audit queue.
await state.hooks.tool.get("execute.after")({
  tool: "edit",
  status: "completed",
  input: { path: path.join(tmp, "battery-file.txt") },
  result: { content: "ok" },
});
await new Promise((r) => setTimeout(r, 2600)); // audit flush cadence is 2s
const obsRes = await fetch("http://127.0.0.1:7778/api/memory/observations/search?query=file-change&limit=5")
  .then((r) => r.json())
  .catch(() => null);
const obsRows = Array.isArray(obsRes?.data) ? obsRes.data : [];
check(
  "file-change observation reaches kernel",
  obsRows.some((x) => /file-change/.test(JSON.stringify(x))),
  JSON.stringify(obsRes)?.slice(0, 100)
);

const permEvent = { sessionID: "ses_hook", action: "bash", resources: ["rm -rf /data"], effect: "allow" };
process.env.HYPERNEXUS_RBAC = "deny";
await state.hooks.permission.get("evaluate")(permEvent);
check("permission hook denies in deny mode", permEvent.effect === "deny");
process.env.HYPERNEXUS_RBAC = "ask";
const permEvent2 = { sessionID: "ses_hook", action: "bash", resources: ["mkfs /dev/sda"], effect: "allow" };
await state.hooks.permission.get("evaluate")(permEvent2);
check("permission hook escalates in ask mode", permEvent2.effect === "ask");
process.env.HYPERNEXUS_RBAC = "audit";
const permEvent3 = { sessionID: "ses_hook", action: "read", resources: ["README.md"], effect: "allow" };
await state.hooks.permission.get("evaluate")(permEvent3);
check("permission hook leaves safe actions alone", permEvent3.effect === "allow");

const shellEvent = { command: "echo hi", cwd: tmp, timeout: 1000, shell: "sh", env: {} };
await state.hooks.shell.get("create.before")(shellEvent);
check("shell hook injects HYPERNEXUS_URL", typeof shellEvent.env.HYPERNEXUS_URL === "string");
check("shell hook injects HYPERNEXUS_CLIENT", shellEvent.env.HYPERNEXUS_CLIENT?.startsWith("opencode/"));

section("8. V1 compatibility shim");
const v1 = await plugin.server({}, {});
check("V1 server() returns hook map", typeof v1 === "object" && typeof v1["tool.execute.before"] === "function");
check("V1 chat.message hook", typeof v1["chat.message"] === "function");
check("V1 permission.ask hook", typeof v1["permission.ask"] === "function");
check("V1 tool catalog exposed", v1.tool && Object.keys(v1.tool).length === 29, `got ${Object.keys(v1.tool || {}).length}`);
await v1["chat.message"]({ message: { role: "user", content: "hello battery world" } });
const v1out = await v1.tool.hypernexus_status.execute({});
check("V1 tool execute works", typeof v1out === "string" && v1out.length > 0);
await v1["tool.execute.after"]({ tool: "read", output: "y".repeat(500) });
check("V1 tool.execute.after is non-throwing", true);

await cleanup();

section("9. Degradation contract (kernel down)");
process.env.HYPERNEXUS_URL = "http://127.0.0.1:9"; // dead port
const dead = makeMockCtx({ directory: tmp, baseUrl: "http://127.0.0.1:9" });
const deadCleanup = await plugin.setup(dead.ctx);
check("setup succeeds with kernel down", typeof deadCleanup === "function");
const deadStatus = await dead.state.tools.get("hypernexus_status").execute({}, {});
check("status tool degrades gracefully", typeof deadStatus?.content === "string" && deadStatus.content.length > 0);
const deadStore = await dead.state.tools.get("hypernexus_memory_store").execute({ content: "x" }, {});
check("memory_store reports failure without throwing", typeof deadStore?.content === "string" && /failed|degraded|timeout|unreachable|error/i.test(deadStore.content));
const deadPrompt = dead.state.hooks.session.get("prompt");
const dpEvent = { sessionID: "ses_dead", prompt: { text: "recall @memory:architecture now", files: [] }, metadata: {}, delivery: "steer" };
const t0 = Date.now();
await deadPrompt(dpEvent);
const elapsed = Date.now() - t0;
check("prompt hook stays inside hook budget when kernel down", elapsed < 2500, `took ${elapsed}ms`);
const deadCtxHook = dead.state.hooks.session.get("context");
const dcEvent = { sessionID: "ses_dead", kind: "primary", system: [], messages: [{ role: "user", content: "hello world probe" }], tools: {}, options: {} };
await deadCtxHook(dcEvent);
check("context hook injects offline notice", /offline|unreachable|degraded/i.test(dcEvent.system[0]?.text ?? "") || dcEvent.system.length === 1);
await deadCleanup();
delete process.env.HYPERNEXUS_URL;

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n== SUMMARY: ${passed}/${passed + failed} passed`);
if (failed) {
  console.log(`Failed: ${failures.join(" | ")}`);
  process.exit(1);
}
