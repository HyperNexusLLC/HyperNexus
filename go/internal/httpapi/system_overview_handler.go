package httpapi

import (
	"net/http"
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/buildinfo"
)

// handleSystemOverview returns a unified snapshot using Go-native data sources.
// The Go kernel is the sole control plane — no external upstream is required.
func (s *Server) handleSystemOverview(w http.ResponseWriter, r *http.Request) {
	// ---- MCP Status (Go-local) ----
	mcpData := map[string]any{
		"initialized":    false,
		"serverCount":    0,
		"toolCount":      0,
		"connectedCount": 0,
	}
	mcpBridge := map[string]any{"procedure": "mcp.getStatus"}

	view, viewErr := s.localMCPInventoryView()
	if viewErr == nil && view.Inventory != nil {
		mcpData["initialized"] = true
		mcpData["serverCount"] = len(view.Inventory.Servers)
		mcpData["toolCount"] = len(view.Inventory.Tools)
		mcpBridge["fallback"] = "go-local-mcp-inventory"
	}

	// ---- Startup Status (Go-local) ----
	startupBridge := map[string]any{"procedure": "startupStatus", "fallback": "go-local"}

	// ---- Sessions (Go-local) ----
	sessionsData := s.supervisorManager.ListSessions()
	sessionsBridge := map[string]any{"procedure": "session.list", "fallback": "go-local-supervisor"}

	// ---- Memory (Go-local) ----
	memoryBridge := map[string]any{"procedure": "memory.getSessionBootstrap", "fallback": "go-local-memory"}

	// ---- Health (Go-local) ----
	goHealth := map[string]any{
		"version":  buildinfo.Version,
		"uptimeMs": time.Since(s.startedAt).Milliseconds(),
		"status":   "ok",
	}

	overview := map[string]any{
		"success": true,
		"data": map[string]any{
			"mcpStatus": map[string]any{
				"initialized":    mcpData["initialized"],
				"serverCount":    mcpData["serverCount"],
				"toolCount":      mcpData["toolCount"],
				"connectedCount": mcpData["connectedCount"],
				"bridge":         mcpBridge,
			},
			"startupStatus": map[string]any{
				"status":  "running",
				"ready":   true,
				"summary": "TN Kernel operational",
				"bridge":  startupBridge,
			},
			"sessions": map[string]any{
				"list":   sessionsData,
				"bridge": sessionsBridge,
			},
			"memory": map[string]any{
				"items":  []any{},
				"count":  0,
				"bridge": memoryBridge,
			},
			"health": map[string]any{
				"goSidecar": goHealth,
			},
			"timestamp": time.Now().UnixMilli(),
		},
	}

	writeJSON(w, http.StatusOK, overview)
}
