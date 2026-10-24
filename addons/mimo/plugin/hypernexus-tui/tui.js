// HyperNexus MiMoCode TUI plugin — mirrors the Pi extension's registerCommand /
// ctx.ui.* / registerShortcut surface using the MiMoCode TuiPluginApi.
// Registers slash commands, surfaces kernel results via toast + dialog, and adds a
// keybind. Every kernel call is budgeted so the UI never freezes.

const DEFAULT_BASE = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";

async function hnGet(path, budget = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), budget);
  try {
    const res = await fetch(DEFAULT_BASE + path, { signal: ctrl.signal });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  } catch (err) {
    return { note: `HyperNexus unreachable (${err && err.name === "AbortError" ? "timeout" : err})` };
  } finally {
    clearTimeout(timer);
  }
}

function toast(api, variant, title, message) {
  try { api.ui.toast({ variant, title, message: String(message).slice(0, 500) }); } catch { /* noop */ }
}

export const tui = async (api, options = {}, meta = {}) => {
  // TUI plugins receive the TuiPluginApi only in interactive TUI mode. In headless
  // runs (`mimo run`) `api` is absent / lacks command registration — return empty
  // server hooks so the loader's server-plugin path is satisfied without a warning.
  if (!api || typeof api.command?.register !== "function") {
    console.error("[hypernexus-tui] no TUI api (headless mode?) — skipping UI registration");
    return {};
  }
  if (options && options.baseUrl) {
    // allow override; keep DEFAULT_BASE for fetch closure simplicity
  }
  const base = (options && options.baseUrl) || DEFAULT_BASE;
  const get = async (path, budget) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), budget || 4000);
    try {
      const res = await fetch(base + path, { signal: ctrl.signal });
      const text = await res.text();
      try { return JSON.parse(text); } catch { return text; }
    } catch (err) {
      return { note: `unreachable (${err && err.name === "AbortError" ? "timeout" : String(err).slice(0, 60)})` };
    } finally { clearTimeout(timer); }
  };

  // Slash commands (the registerCommand analog). Each fetches the kernel and toasts.
  api.command.register(() => [
    {
      title: "HyperNexus: Kernel Status",
      value: "hn-status",
      description: "Health, version, uptime, and MCP bridge status of the HyperNexus kernel",
      category: "HyperNexus",
      slash: { name: "hn-status", aliases: ["hns"] },
      suggested: true,
      keybind: "ctrl+alt+s",
      onSelect: async () => {
        toast(api, "info", "HyperNexus", "Checking kernel status…");
        const h = await get("/health", 3000);
        const m = await get("/api/mcp/status", 3000);
        const ok = h && h.ok;
        toast(api, ok ? "success" : "error", `Kernel ${ok ? "online" : "offline"}`,
          ok ? `v${h.version || "?"} · up ${Math.round((h.uptimeSec || 0) / 60)}m · mcp ${(m && m.bridge && m.bridge.fallback) || "ok"}` : (h && h.note) || "unreachable");
      },
    },
    {
      title: "HyperNexus: Search Tool Catalog",
      value: "hn-search",
      description: "Search the 50K+ MCP tool catalog (progressive routing)",
      category: "HyperNexus",
      slash: { name: "hn-search", aliases: ["hnfind"] },
      onSelect: async () => {
        let q = "";
        try {
          const val = await new Promise((resolve) => {
            api.ui.dialog.replace(() =>
              api.ui.DialogPrompt({
                title: "Search HyperNexus catalog",
                placeholder: "e.g. search memory, read PDF, deploy",
                onConfirm: (v) => resolve(v),
                onCancel: () => resolve(""),
                onClose: () => resolve(q),
              })
            );
          });
          q = String(val || "").trim();
        } catch { /* dialog unavailable */ }
        if (!q) { toast(api, "info", "HyperNexus", "Search cancelled"); return; }
        toast(api, "info", "HyperNexus", `Searching “${q}”…`);
        const r = await get(`/api/tools/search?query=${encodeURIComponent(q)}`, 5000);
        const tools = r && Array.isArray(r.data) ? r.data.slice(0, 8) : [];
        if (!tools.length) { toast(api, "warning", "No tools", (r && r.note) || `No matches for “${q}”`); return; }
        const list = tools.map((t) => `• ${t.name || t.id || "?"} — ${String(t.description || "").slice(0, 60)}`).join("\n");
        toast(api, "success", `${tools.length} tools`, list.slice(0, 400));
      },
    },
    {
      title: "HyperNexus: Tool Suggestions",
      value: "hn-suggest",
      description: "Ask the local-LLM monitor which MCP tools fit a task",
      category: "HyperNexus",
      slash: { name: "hn-suggest", aliases: ["hnsug"] },
      onSelect: async () => {
        let q = "";
        try {
          const val = await new Promise((resolve) => {
            api.ui.dialog.replace(() =>
              api.ui.DialogPrompt({
                title: "Suggest HyperNexus tools",
                placeholder: "Describe the task…",
                onConfirm: (v) => resolve(v),
                onCancel: () => resolve(""),
                onClose: () => resolve(""),
              })
            );
          });
          q = String(val || "").trim();
        } catch { /* dialog unavailable */ }
        if (!q) return;
        await get("/api/mcp/tool-suggestions", 500); // trigger predictor (fire-and-forget)
        toast(api, "info", "HyperNexus", "Gathering suggestions…");
        const g = await get(`/api/mcp/tool-suggestions?query=${encodeURIComponent(q)}`, 5000);
        const data = g && g.data;
        if (Array.isArray(data) && data.length) {
          toast(api, "success", `${data.length} suggestions`, data.map((d) => `• ${d.name || d.tool || d}`).join("\n").slice(0, 400));
        } else {
          toast(api, "warning", "No suggestions", (g && g.note) || "Advertiser returned no matches right now");
        }
      },
    },
    {
      title: "HyperNexus: Memory Search",
      value: "hn-memory",
      description: "Search the cross-session L2 memory vault",
      category: "HyperNexus",
      slash: { name: "hn-memory", aliases: ["hnmem"] },
      onSelect: async () => {
        let q = "";
        try {
          const val = await new Promise((resolve) => {
            api.ui.dialog.replace(() =>
              api.ui.DialogPrompt({
                title: "Search HyperNexus memory",
                placeholder: "What to look for…",
                onConfirm: (v) => resolve(v),
                onCancel: () => resolve(""),
                onClose: () => resolve(""),
              })
            );
          });
          q = String(val || "").trim();
        } catch { /* dialog unavailable */ }
        if (!q) return;
        toast(api, "info", "HyperNexus", "Searching memory (may be slow on first call)…");
        const r = await get(`/api/memory/search?query=${encodeURIComponent(q)}&limit=5`, 9000);
        const hits = r && Array.isArray(r.data) ? r.data.slice(0, 5) : r && Array.isArray(r.results) ? r.results.slice(0, 5) : [];
        if (hits.length) {
          toast(api, "success", `${hits.length} memories`, hits.map((h) => `• ${String(h.title || h.content || h).slice(0, 50)}`).join("\n").slice(0, 400));
        } else {
          toast(api, "warning", "No memories", (r && r.note) || `Nothing for “${q}”`);
        }
      },
    },
    {
      title: "HyperNexus: Harvest Context",
      value: "hn-harvest",
      description: "Store a context snapshot into HyperNexus memory",
      category: "HyperNexus",
      slash: { name: "hn-harvest", aliases: ["hnh"] },
      onSelect: async () => {
        let s = "";
        try {
          const val = await new Promise((resolve) => {
            api.ui.dialog.replace(() =>
              api.ui.DialogPrompt({
                title: "Harvest context to memory",
                placeholder: "What should be remembered about this point?",
                onConfirm: (v) => resolve(v),
                onCancel: () => resolve(""),
                onClose: () => resolve(""),
              })
            );
          });
          s = String(val || "").trim();
        } catch { /* dialog unavailable */ }
        if (!s) return;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        try {
          await fetch(`${base}/api/memory/facts/add`, {
            method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "context-harvest", content: s, tags: ["context-harvest"], namespace: "project" }),
          });
          toast(api, "success", "Harvested", "Context stored to HyperNexus memory");
        } catch (e) {
          toast(api, "error", "Harvest failed", String(e).slice(0, 120));
        } finally { clearTimeout(timer); }
      },
    },
    {
      title: "HyperNexus: MCP Servers",
      value: "hn-mcp",
      description: "Show connected MCP servers and tool counts",
      category: "HyperNexus",
      slash: { name: "hn-mcp", aliases: ["hnm"] },
      onSelect: async () => {
        toast(api, "info", "HyperNexus", "Checking MCP servers…");
        const r = await get("/api/mcp/servers", 4000);
        const servers = r && Array.isArray(r.data) ? r.data : [];
        if (!servers.length) { toast(api, "warning", "No MCP servers", (r && r.note) || "No servers found"); return; }
        const list = servers.map((s) => `• ${s.name || s.id || "?"} [${s.status || "?"}] ${s.toolCount ?? "?"} tools`).join("\n");
        toast(api, "success", `${servers.length} MCP servers`, list.slice(0, 400));
      },
    },
    {
      title: "HyperNexus: Kernel Routes",
      value: "hn-routes",
      description: "List kernel API routes by category",
      category: "HyperNexus",
      slash: { name: "hn-routes", aliases: ["hnr"] },
      onSelect: async () => {
        let cat = "";
        try {
          const val = await new Promise((resolve) => {
            api.ui.dialog.replace(() =>
              api.ui.DialogPrompt({
                title: "Filter kernel routes",
                placeholder: "Category (memory, mcp, session…) or empty for all",
                onConfirm: (v) => resolve(v),
                onCancel: () => resolve(""),
                onClose: () => resolve(""),
              })
            );
          });
          cat = String(val || "").trim();
        } catch { /* dialog unavailable */ }
        toast(api, "info", "HyperNexus", "Fetching kernel routes…");
        const r = await get("/api/routes", 5000);
        const routes = r && (Array.isArray(r.data) ? r.data : r.data?.routes || r.routes) || [];
        const filtered = cat ? routes.filter((x) => (x.category || x.Category) === cat) : routes;
        if (!filtered.length) { toast(api, "warning", "No routes", (r && r.note) || `No routes${cat ? ` in "${cat}"` : ""}`); return; }
        const list = filtered.slice(0, 8).map((x) => `• ${x.path || x.Path || "?"} [${x.category || x.Category || "?"}]`).join("\n");
        toast(api, "success", `${filtered.length} routes`, list.slice(0, 400));
      },
    },
    {
      title: "HyperNexus: Memory Stats",
      value: "hn-memstats",
      description: "Show L2 memory vault statistics",
      category: "HyperNexus",
      slash: { name: "hn-memstats", aliases: ["hnms"] },
      onSelect: async () => {
        toast(api, "info", "HyperNexus", "Fetching memory stats…");
        const r = await get("/api/agent-memory/stats", 4000);
        const d = r && r.data ? r.data : r;
        if (d && (d.total || d.count || d.l2Count)) {
          toast(api, "success", "Memory stats", JSON.stringify(d).slice(0, 400));
        } else {
          toast(api, "warning", "No stats", (r && r.note) || "Memory stats unavailable");
        }
      },
    },
    {
      title: "HyperNexus: Code Search",
      value: "hn-codesearch",
      description: "Search codebase symbols via AST graph",
      category: "HyperNexus",
      slash: { name: "hn-codesearch", aliases: ["hncs"] },
      onSelect: async () => {
        let q = "";
        try {
          const val = await new Promise((resolve) => {
            api.ui.dialog.replace(() =>
              api.ui.DialogPrompt({
                title: "Search codebase symbols",
                placeholder: "Function, class, or variable name…",
                onConfirm: (v) => resolve(v),
                onCancel: () => resolve(""),
                onClose: () => resolve(""),
              })
            );
          });
          q = String(val || "").trim();
        } catch { /* dialog unavailable */ }
        if (!q) return;
        toast(api, "info", "HyperNexus", `Searching symbols for "${q}"…`);
        const r = await get(`/api/code/symbols?q=${encodeURIComponent(q)}`, 5000);
        const hits = r && (Array.isArray(r.data) ? r.data : r.data?.results || r.results) || [];
        if (hits.length) {
          toast(api, "success", `${hits.length} symbols`, hits.slice(0, 6).map((h) => `• ${h.name || h.symbol || h}`).join("\n").slice(0, 400));
        } else {
          toast(api, "warning", "No symbols", (r && r.note) || `Nothing for "${q}"`);
        }
      },
    },
  ]);

  // === Deep-wiring: remaining TuiPluginApi surfaces (keybind, kv, route, event) ===

  // KEYBIND — HyperNexus palette keybind so the panel is reachable without typing /hn.
  try {
    if (api.keybind && typeof api.keybind.create === "function") {
      api.keybind.create({ "hypernexus.open": "ctrl+alt+h" });
    }
  } catch { /* keybind is optional */ }

  // KV — persist a status snapshot so the panel can render offline.
  try {
    if (api.kv && typeof api.kv.set === "function") {
      api.kv.set("hn.loadedAt", new Date().toISOString());
      if (meta && meta.id) api.kv.set("hn.pluginId", meta.id);
    }
  } catch { /* kv is optional */ }

  // ROUTE — register a HyperNexus route (navigable via api.route.navigate).
  try {
    if (api.route && typeof api.route.register === "function") {
      api.route.register([
        {
          name: "hypernexus",
          render: () => {
            try {
              return api.ui && typeof api.ui.Slot === "function" ? api.ui.Slot({ name: "hn-panel" }) : null;
            } catch { return null; }
          },
        },
      ]);
    }
  } catch { /* route is optional */ }

  // EVENT — subscribe to session lifecycle and mirror a lightweight breadcrumb to kv.
  try {
    if (api.event && typeof api.event.on === "function") {
      api.event.on("session_start", () => {
        try { if (api.kv && api.kv.set) api.kv.set("hn.lastSessionStart", new Date().toISOString()); } catch { /* noop */ }
      });
      api.event.on("session_end", () => {
        try { if (api.kv && api.kv.set) api.kv.set("hn.lastSessionEnd", new Date().toISOString()); } catch { /* noop */ }
      });
    }
  } catch { /* event is optional */ }

  // A quick-access toast on activation so users know HyperNexus is wired in.
  const pluginLabel = meta && meta.id ? `${meta.id}${meta.version ? "@" + meta.version : ""}` : "HyperNexus";
  toast(api, "success", pluginLabel, "Commands ready: /hn-status /hn-search /hn-suggest /hn-memory /hn-harvest");
  return {};
};

export default tui;
