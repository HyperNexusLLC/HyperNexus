// Broad HyperNexus endpoint sweep — finds 404s / errors across categories.
const BASE = "http://127.0.0.1:7778";
const EP = [
  "/health", "/version", "/api/system/overview", "/api/runtime/status", "/api/config/status",
  "/api/mcp/status", "/api/mcp/servers", "/api/mcp/tools", "/api/native/tools/search?query=x",
  "/api/memory/list?limit=1", "/api/memory/fts-search?q=a&limit=1", "/api/skills", "/api/skills/summary",
  "/api/sessions/summary", "/api/sessions/imported/list?limit=1", "/api/billing/status", "/api/providers/status",
  "/api/mesh/status", "/api/metrics/summary", "/api/catalog/stats", "/api/agent-memory/stats",
  "/api/plan/list", "/api/workflows", "/api/team/list", "/api/mode/status", "/api/tools/search?query=x",
  "/api/council/sessions", "/api/director/status", "/api/swarm/status", "/api/squad/status",
  "/api/submodules/list", "/api/knowledge/graph", "/api/memory/observations/recent", "/api/graph",
  "/api/symbols/list", "/api/research/list", "/api/clouddev/providers", "/api/browser/status",
  "/api/import/summary", "/api/settings", "/api/audit?limit=1", "/api/tool-chains/list",
];
let ok = 0, bad = []; 
for (const ep of EP) {
  try {
    const r = await fetch(BASE + ep, { signal: AbortSignal.timeout(12000) });
    if (r.status >= 200 && r.status < 400) ok++;
    else bad.push(`[${r.status}] ${ep}`);
  } catch (e) { bad.push(`[ERR] ${ep}: ${String(e).slice(0, 30)}`); }
}
console.log(`ENDPOINT SWEEP: ${ok}/${EP.length} OK`);
for (const b of bad) console.log("  ", b);
