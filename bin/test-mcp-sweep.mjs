#!/usr/bin/env node
/**
 * test-mcp-sweep.mjs — every kernel MCP tool, invoked
 * ====================================================
 * Discovers every tool the kernel MCP registry exposes (/api/mcp/tools +
 * chat-surface extras), derives safe arguments from each JSON schema, and calls
 * each one through /api/agent/tool — the same router path the OpenCode plugin's
 * hypernexus_mcp_call uses.
 *
 * Destructive / external-effect tools are skipped with a documented reason
 * (they are covered by shape checks only).
 *
 * Run: node bin/test-mcp-sweep.mjs
 */

const BASE = "http://127.0.0.1:7778";
const TMP = process.env.TEMP || process.env.TMP || ".";

// Never auto-invoke: destructive, externally mutating, or UI-automating.
const SKIP = new Map([
  ["kill_process", "destructive: kills processes"],
  ["delete_memory", "destructive: deletes L2 records"],
  ["install_mcp_server", "external effect: installs packages"],
  ["download_llamafile", "external effect: downloads binaries"],
  ["launch_webview", "external effect: opens GUI windows"],
  ["update_supervisor_settings", "mutates supervisor configuration"],
  ["jira_create_issue", "external effect: creates Jira tickets"],
  ["advance_chat", "UI automation: drives a chat client"],
  ["click_action_buttons", "UI automation: clicks buttons"],
  ["click_chat_button", "UI automation: clicks buttons"],
  ["set_chat_input", "UI automation: writes into a chat client"],
  ["submit_chat_input", "UI automation: submits chat input"],
  ["simulate_input", "UI automation: synthesizes input events"],
]);

// Pre-create the file that edit/read flows depend on (inventory order is not guaranteed).
try {
  const fs = await import("node:fs");
  fs.writeFileSync(`${TMP}\\hn-sweep-write.txt`, "sweep-probe", "utf8");
} catch {
  /* ignore */
}

// Fixed safe arguments for tools whose semantics the schema cannot express safely.
const SAFE_ARGS = new Map([
  ["bash", { command: "echo sweep-probe" }],
  ["run_shell_command", { command: "echo sweep-probe" }],
  ["echo", { message: "sweep-probe" }],
  ["hello_world", { name: "sweep" }],
  ["write", { path: `${TMP}\\hn-sweep-write.txt`, content: "sweep-probe" }],
  ["write_file", { path: `${TMP}\\hn-sweep-write2.txt`, content: "sweep-probe" }],
  ["read", { path: `${TMP}\\hn-sweep-write.txt` }],
  ["read_file", { path: `${TMP}\\hn-sweep-write.txt` }],
  ["ls", { path: TMP }],
  ["find", { pattern: "*.txt", path: TMP }],
  ["grep", { pattern: "sweep-probe", path: `${TMP}\\hn-sweep-write.txt`, literal: true }],
  ["confluence_search", { query: "probe" }],
  ["code_interpreter", { code: "1+1" }],
  ["codebase_outline", { filePath: TMP }],
  ["codebase_search", { query: "probe", path: TMP }],
  ["repomap", { path: TMP }],
  ["search_memory", { query: "probe", limit: 2 }],
  ["add_memory", { content: `sweep-probe ${Date.now()}`, tags: ["sweep"] }],
  ["memory_scratchpad_get", { key: "sweep" }],
  ["memory_scratchpad_set", { key: "sweep", value: "ok" }],
  ["memory_scratchpad_append", { key: "sweep", value: "ok" }],
  ["memory_extract_relations", { text: "HyperNexus uses a Go kernel on port 7778." }],
  ["memory_extract_relations_batch", { items: ["HyperNexus uses a Go kernel on port 7778."], limit: 2 }],
  ["mcp_list_servers", {}],
  ["mcp_list_tools", {}],
  ["mcp_status", {}],
  ["mcp_call_tool", { serverName: "hypernexus", toolName: "hello_world", arguments: { name: "sweep" } }],
  ["mcp_server_test", { name: "hypernexus" }],
  ["search", { pattern: "sweep-probe" }],
  ["system_status", {}],
  ["get_system_stats", {}],
  ["list_accessory_tools", {}],
  ["list_processes", {}],
  ["list_surface_profiles", {}],
  ["get_supervisor_settings", {}],
  ["detect_chat_surface", {}],
  ["detect_chat_state", {}],
  ["inspect_window_ui", {}],
  ["cloud_troubleshoot", {}],
  ["generate_devops_pipeline", { service: "probe" }],
  ["apply_search_replace", { file_path: `${TMP}\\hn-sweep-write.txt`, search_block: "sweep-probe", replace: "sweep-probe" }],
  ["edit", { path: `${TMP}\\hn-sweep-write.txt`, edits: [{ oldText: "sweep-probe", newText: "sweep-probe" }] }],
  ["add_bookmark", { title: "sweep-probe", url: "https://example.invalid" }],
]);

function fillArgs(schema) {
  const args = {};
  const props = schema?.properties || {};
  const required = schema?.required || Object.keys(props);
  for (const key of required) {
    const p = props[key] || {};
    const k = key.toLowerCase();
    if (p.enum && p.enum.length) {
      args[key] = p.enum[0];
    } else if (p.type === "number" || p.type === "integer") {
      args[key] = k.includes("pid") ? 1 : 1;
    } else if (p.type === "boolean") {
      args[key] = false;
    } else if (p.type === "array") {
      args[key] = [];
    } else if (p.type === "object") {
      args[key] = {};
    } else {
      if (k.includes("path") || k.includes("file") || k.includes("dir")) args[key] = TMP;
      else if (k.includes("command") || k.includes("cmd")) args[key] = "echo sweep-probe";
      else args[key] = "sweep-probe";
    }
  }
  return args;
}

async function callTool(name, args) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(`${BASE}/api/agent/tool`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, args }),
    });
    const text = await r.text();
    try {
      return { status: r.status, json: JSON.parse(text), text };
    } catch {
      return { status: r.status, json: null, text };
    }
  } catch (e) {
    return { status: 0, json: null, text: String(e) };
  } finally {
    clearTimeout(timer);
  }
}

let pass = 0;
let soft = 0;
let fail = 0;
const skipped = [];

function classify(name, res) {
  const body = (res.text || "").trim();
  if (res.status === 0) return { verdict: "FAIL", note: `transport: ${body.slice(0, 80)}` };
  if (/panic|fatal error|goroutine \d+ \[/i.test(body)) return { verdict: "FAIL", note: "kernel panic in response" };
  if (body.length === 0) return { verdict: "FAIL", note: "empty response" };
  // Structured failures are graceful degradation, not crashes.
  if (/"success"\s*:\s*false/.test(body) || (/"error"\s*:/.test(body) && !/"bridge"\s*:/.test(body))) {
    return { verdict: "SOFT", note: body.replace(/\s+/g, " ").slice(0, 90) };
  }
  return { verdict: "PASS", note: body.replace(/\s+/g, " ").slice(0, 90) };
}

// 1. Registry tools (with schemas)
const invRes = await fetch(`${BASE}/api/mcp/tools`).then((r) => r.json());
const inv = Array.isArray(invRes?.data) ? invRes.data : [];
console.log(`=== T10-MCP-SWEEP: ${inv.length} registry tools ===`);

for (const tool of inv) {
  const name = tool.name;
  if (SKIP.has(name)) {
    skipped.push(`${name}: ${SKIP.get(name)}`);
    continue;
  }
  const args = SAFE_ARGS.get(name) ?? fillArgs(tool.inputSchema);
  const res = await callTool(name, args);
  const v = classify(name, res);
  if (v.verdict === "PASS") pass++;
  else if (v.verdict === "SOFT") soft++;
  else fail++;
  console.log(`  ${v.verdict === "SOFT" ? "SOFT " : v.verdict === "PASS" ? "PASS " : "FAIL "} ${name} — ${v.note}`);
}

// 2. Chat-surface extras not in the registry inventory
console.log("=== T10-MCP-SWEEP: chat-surface extras ===");
const EXTRAS = ["detect_chat_surface", "detect_chat_state", "inspect_window_ui", "mcp_status", "mcp_list_servers", "mcp_list_tools", "mcp_call_tool", "mcp_server_test"];
for (const name of EXTRAS) {
  if (inv.some((t) => t.name === name)) continue;
  const res = await callTool(name, SAFE_ARGS.get(name) ?? {});
  const v = classify(name, res);
  if (v.verdict === "PASS") pass++;
  else if (v.verdict === "SOFT") soft++;
  else fail++;
  console.log(`  ${v.verdict === "SOFT" ? "SOFT " : v.verdict === "PASS" ? "PASS " : "FAIL "} ${name} — ${v.note}`);
}

// 3. Stdio transport: initialize + tools/list + tools/call against the MCP server itself
console.log("=== T10-MCP-SWEEP: stdio transport (hypernexus mcp) ===");
{
  const { spawn } = await import("node:child_process");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const exeName = process.platform === "win32" ? "hypernexus.exe" : "hypernexus";
  const exe = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), exeName);
  const server = fs.existsSync(exe) ? exe : exeName;
  const child = spawn(server, ["mcp"], { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env } });
  let buf = "";
  const pending = new Map();
  child.stdout.on("data", (d) => {
    buf += d.toString();
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined && pending.has(msg.id)) {
          pending.get(msg.id)(msg);
          pending.delete(msg.id);
        }
      } catch {
        /* ignore non-JSON lines */
      }
    }
  });
  const rpc = (method, params, id) =>
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ timeout: true }), 15000);
      pending.set(id, (m) => {
        clearTimeout(timer);
        resolve(m);
      });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });

  const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t10-sweep", version: "1.0" } }, 1);
  const initOk = init?.result?.serverInfo?.name !== undefined || init?.result?.protocolVersion !== undefined;
  checkStdio("stdio initialize", initOk, JSON.stringify(init).slice(0, 90));

  const list = await rpc("tools/list", {}, 2);
  const stdioTools = list?.result?.tools ?? [];
  checkStdio("stdio tools/list", stdioTools.length > 0, `${stdioTools.length} tools`);
  checkStdio("stdio tool count covers registry", stdioTools.length >= inv.length, `stdio=${stdioTools.length} registry=${inv.length}`);

  const call = await rpc("tools/call", { name: "hello_world", arguments: { name: "stdio-sweep" } }, 3);
  const callText = JSON.stringify(call?.result ?? call);
  checkStdio("stdio tools/call hello_world", /stdio-sweep|hello/i.test(callText), callText.slice(0, 90));

  child.kill();
}

function checkStdio(name, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name} — ${detail}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name} — ${detail}`);
  }
}

const called = pass + soft + fail;
console.log(`\n=== T10-MCP-SWEEP SUMMARY: ${called} invoked — ${pass} pass, ${soft} soft (graceful), ${fail} fail, ${skipped.length} skipped ===`);
for (const s of skipped) console.log(`  SKIP ${s}`);
if (fail > 0) process.exit(1);
