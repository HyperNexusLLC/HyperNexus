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

export const tui = async (api, options = {}) => {
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
  ]);

  // A quick-access toast on activation so users know HyperNexus is wired in.
  toast(api, "success", "HyperNexus", "Commands ready: /hn-status /hn-search /hn-suggest /hn-memory /hn-harvest");

  // Return a hook object (TUI plugins register commands; no server hooks needed).
  // Returning void triggers the loader's "did not return a hook object" warning.
  return {};
};

export default tui;
