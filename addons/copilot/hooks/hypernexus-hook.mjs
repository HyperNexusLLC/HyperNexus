#!/usr/bin/env node
const BASE = (process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778").replace(/\/+$/, "");
const event = process.argv[2] || "";
const RBAC = process.env.HYPERNEXUS_RBAC || "audit";

async function readInput() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  try {
    return JSON.parse(text || "{}");
  } catch (error) {
    process.stderr.write(`[hypernexus-hook] Invalid hook input: ${error.message}\n`);
    return {};
  }
}

function output(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function get(pathname) {
  try {
    const response = await fetch(`${BASE}${pathname}`, {
      signal: AbortSignal.timeout(2200),
      headers: { "X-HyperNexus-Client": "copilot-plugin/1.0.0" },
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    if (process.env.HYPERNEXUS_HOOK_DEBUG === "1") {
      process.stderr.write(`[hypernexus-hook] Kernel request failed: ${error.message}\n`);
    }
    return { ok: false, status: 0, data: null };
  }
}

function rowsFrom(result) {
  const value = result?.data;
  const rows = Array.isArray(value) ? value : value?.data ?? value?.results ?? value?.records;
  return Array.isArray(rows) ? rows : [];
}

function formatMatches(result) {
  return rowsFrom(result).slice(0, 3).map((row) => {
    const record = row?.record ?? row;
    const title = typeof record?.title === "string" ? record.title : "";
    const content = typeof record?.content === "string"
      ? record.content
      : typeof record?.text === "string" ? record.text : "";
    const tags = Array.isArray(record?.tags) ? ` [${record.tags.join(", ")}]` : "";
    const text = content.trim().slice(0, 500);
    return text ? `- ${title ? `${title}: ` : ""}${text}${tags}` : "";
  }).filter(Boolean);
}

function memoryQuery(prompt) {
  const match = /@memory:(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/i.exec(prompt || "");
  return match?.[1] || match?.[2] || match?.[3] || "";
}

function dangerousTool(input) {
  const name = input.toolName ?? input.tool_name ?? "";
  if (name !== "bash" && name !== "powershell") return false;
  const args = input.toolArgs ?? input.toolInput ?? input.tool_input ?? {};
  const command = typeof args === "string" ? args : String(args?.command ?? "");
  return /\brm\s+-rf\b|\bdel\s+\/[sfq]\b|\bformat\s+[a-z]:|\bdrop\s+table\b|\bdelete\s+from\b|\bshutdown\b|\breboot\b|\bmkfs\b|\bdd\s+if=/i.test(command)
    || /Remove-Item\b(?=.*-Recurse\b)(?=.*-Force\b)/i.test(command);
}

async function run(input) {
  if (event === "sessionStart") {
    const health = await get("/health");
    const status = health.ok
      ? `HyperNexus kernel is available (version ${health.data?.version ?? "unknown"}).`
      : "HyperNexus kernel is unavailable; report MCP or memory errors plainly and continue without kernel-backed context.";
    output({ additionalContext: `${status} Use the hypernexus MCP server for memory, discovery, graph, session, and operations tools.` });
    return;
  }

  if (event === "userPromptTransformed") {
    const prompt = input.transformedPrompt ?? input.transformed_prompt ?? "";
    const query = memoryQuery(prompt);
    if (!query) return;
    const result = await get(`/api/memory/fts-search?q=${encodeURIComponent(query)}&limit=5`);
    if (!result.ok) {
      process.stderr.write("[hypernexus-hook] Explicit @memory lookup failed; prompt left unchanged.\n");
      return;
    }
    const matches = formatMatches(result);
    const addition = matches.length
      ? `\n\nHyperNexus memory matches for @memory:${query}:\n${matches.join("\n")}`
      : `\n\nHyperNexus found no memory matches for @memory:${query}.`;
    output({ modifiedTransformedPrompt: `${prompt}${addition}` });
    return;
  }

  if (event === "preToolUse" && dangerousTool(input)) {
    if (RBAC === "deny") {
      output({
        permissionDecision: "deny",
        permissionDecisionReason: "HyperNexus RBAC blocked a destructive shell command (HYPERNEXUS_RBAC=deny).",
      });
    } else if (RBAC === "ask") {
      output({
        permissionDecision: "ask",
        permissionDecisionReason: "HyperNexus RBAC requires confirmation for a destructive shell command.",
      });
    } else if (RBAC !== "audit") {
      process.stderr.write(`[hypernexus-hook] Unknown HYPERNEXUS_RBAC mode '${RBAC}'; using audit behavior.\n`);
    }
    return;
  }

  if (event === "permissionRequest" && dangerousTool(input) && RBAC === "deny") {
    output({
      behavior: "deny",
      message: "HyperNexus RBAC blocked a destructive shell command (HYPERNEXUS_RBAC=deny).",
    });
    return;
  }

  if (event === "postToolUseFailure") {
    const name = input.toolName ?? input.tool_name ?? "";
    if (String(name).toLowerCase().includes("hypernexus")) {
      output({
        additionalContext: "A HyperNexus tool failed. Check system_status or MCP connectivity, retry only when appropriate, and state clearly if the kernel remains unavailable.",
      });
    }
    return;
  }

  if (event === "subagentStart") {
    output({
      additionalContext: "For HyperNexus work, use RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY. Treat kernel responses as authoritative; never invent successful memory or MCP operations.",
    });
  }
}

const input = await readInput();
await run(input);
