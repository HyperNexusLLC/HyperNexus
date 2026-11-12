// T10-CORE: verify kernel core functionality works WITHOUT the plugin/extension
// (direct HTTP endpoints — the same surface the extension calls, but tested bare).
const BASE = "http://127.0.0.1:7778";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}${detail ? " — " + detail.slice(0, 90) : ""}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? " — " + detail.slice(0, 140) : ""}`); }
}
async function get(path, budget = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), budget);
  try {
    const r = await fetch(BASE + path, { signal: ctrl.signal });
    const text = await r.text();
    let j; try { j = JSON.parse(text); } catch { j = { raw: text }; }
    return { status: r.status, body: j };
  } catch (e) { return { status: 0, body: { error: String(e) } }; }
  finally { clearTimeout(timer); }
}
async function post(path, body, budget = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), budget);
  try {
    const r = await fetch(BASE + path, {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let j; try { j = JSON.parse(text); } catch { j = { raw: text }; }
    return { status: r.status, body: j };
  } catch (e) { return { status: 0, body: { error: String(e) } }; }
  finally { clearTimeout(timer); }
}
function ok(j) { return j && (j.success !== false) && !j.error && !j.raw?.includes("error"); }

console.log("=== T10-CORE: HEALTH & STATUS (no extension) ===");
{
  const r = await get("/health");
  check("GET /health", r.status === 200 && r.body.ok !== false, `status=${r.status} ok=${r.body.ok}`);
}
{
  const r = await get("/api/mcp/status");
  check("GET /api/mcp/status", r.status === 200 && r.body.success !== false, `status=${r.status}`);
}
{
  const r = await get("/api/config/status");
  check("GET /api/config/status", r.status === 200, `status=${r.status}`);
}
{
  const r = await get("/api/runtime/status");
  check("GET /api/runtime/status", r.status === 200, `status=${r.status}`);
}
{
  const r = await get("/api/system/overview");
  check("GET /api/system/overview", r.status === 200, `status=${r.status}`);
}
{
  const r = await get("/version");
  check("GET /version", r.status === 200, `status=${r.status}`);
}

console.log("=== T10-CORE: MEMORY ENDPOINTS (no extension) ===");
{
  const r = await post("/api/memory/facts/add", { title: "core-test", content: "core no-extension write", tags: ["core"], namespace: "project" });
  check("POST /api/memory/facts/add", r.status === 200 && r.body.success !== false, `status=${r.status}`);
}
{
  // Budget: vector+embed search is documented ~800ms, but under heavy host load
  // (saturated CPU from unrelated processes) 6-14s observed. 30s keeps the check
  // honest while surviving load-induced latency spikes.
  const r = await get("/api/memory/search?query=core&limit=3", 30000);
  check("GET /api/memory/search", r.status === 200, `status=${r.status}`);
}
{
  const r = await get("/api/memory/list");
  check("GET /api/memory/list", r.status === 200, `status=${r.status} count=${r.body.count}`);
}
{
  const r = await get("/api/agent-memory/stats");
  check("GET /api/agent-memory/stats", r.status === 200 && r.body.success !== false, `status=${r.status}`);
}

console.log("=== T10-CORE: TOOL CATALOG (no extension) ===");
{
  const r = await get("/api/tools/search?query=file&limit=5");
  check("GET /api/tools/search", r.status === 200, `status=${r.status}`);
}
{
  const r = await get("/api/mcp/tool-suggestions?query=deploy");
  check("GET /api/mcp/tool-suggestions", r.status === 200, `status=${r.status}`);
}
{
  const r = await post("/api/mcp/tool-suggestions", { query: "read a PDF" });
  check("POST /api/mcp/tool-suggestions", r.status === 200, `status=${r.status}`);
}
{
  const r = await get("/api/mcp/decision/list-loaded");
  check("GET /api/mcp/decision/list-loaded", r.status === 200, `status=${r.status}`);
}

console.log("=== T10-CORE: SESSION & SKILLS (no extension) ===");
{
  const r = await get("/api/skills/summary");
  check("GET /api/skills/summary", r.status === 200, `status=${r.status}`);
}
{
  const r = await get("/api/sessions/summary");
  check("GET /api/sessions/summary", r.status === 200, `status=${r.status}`);
}

console.log("=== T10-CORE: PROVIDERS & BILLING (no extension) ===");
{
  const r = await get("/api/billing/status");
  check("GET /api/billing/status", r.status === 200, `status=${r.status}`);
}
{
  const r = await get("/api/providers/status");
  check("GET /api/providers/status", r.status === 200 || r.status === 404, `status=${r.status}`);
}

console.log(`\n=== T10-CORE SUMMARY: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
