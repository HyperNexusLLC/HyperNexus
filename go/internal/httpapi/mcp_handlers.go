package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/cache"
	"gitlab.com/HyperNexusLLC/HyperNexus/internal/mcp"
	"gitlab.com/HyperNexusLLC/HyperNexus/internal/tools"
	roottools "gitlab.com/HyperNexusLLC/HyperNexus/tools"
)

func (s *Server) handleMCPStatus(w http.ResponseWriter, r *http.Request) {
	// Cache MCP status for 10s to reduce upstream calls
	val, err := cache.Cached(s.cacheService, "mcp:status", func() (interface{}, error) {
		return s.buildMCPStatus(r.Context())
	}, 30000)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, val)
}

func (s *Server) buildMCPStatus(ctx context.Context) (map[string]any, error) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(ctx, "mcp.getStatus", nil, &result)
	if err == nil {
		return map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.getStatus",
			},
		}, nil
	}
	_, summary, localErr := s.localMCPSummary(ctx)
	if localErr != nil {
		return nil, localErr
	}
	return map[string]any{
		"success": true,
		"data": map[string]any{
			"initialized":              true,
			"connected":                summary.SourceBackedHarnessCount > 0,
			"toolCount":                summary.SourceBackedToolCount,
			"serverCount":              summary.InstalledHarnessCount,
			"connectedCount":           summary.SourceBackedHarnessCount,
			"sourceBackedHarnessCount": summary.SourceBackedHarnessCount,
			"source":                   "source-backed-local-summary",
			"lazySessionMode":          false,
			"singleActiveServerMode":   false,
		},
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.getStatus",
			"reason":    "upstream unavailable; using local MCP harness summary",
		},
	}, nil
}

func (s *Server) handleMCPTools(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.listTools", nil, &result)
	if err == nil {
		var toolsList []map[string]any
		if bytes, errMar := json.Marshal(result); errMar == nil {
			_ = json.Unmarshal(bytes, &toolsList)
		}
		toolsList = s.mergeAccessoryTools(toolsList)
		if len(toolsList) > 0 {
			toolsList = s.injectAlwaysOnStatus(toolsList)
			result = toolsList
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.listTools",
			},
		})
		return
	}

	view, invErr := s.localMCPInventoryView()
	if invErr == nil && view != nil && len(view.Inventory.Tools) > 0 {
		bridge := map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.listTools",
			"reason":    "upstream unavailable; using local MCP inventory cache",
		}
		for key, value := range inventoryBridgeMeta(view) {
			bridge[key] = value
		}
		mergedTools := s.mergeAccessoryTools(fallbackMCPInventoryTools(view))
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    s.injectAlwaysOnStatus(mergedTools),
			"bridge":  bridge,
		})
		return
	}

	_, summary, localErr := s.localMCPSummary(r.Context())
	if localErr != nil {
		if invErr != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": localErr.Error()})
			return
		}
		bridge := map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.listTools",
			"reason":    "upstream unavailable; local MCP inventory cache is empty",
		}
		for key, value := range inventoryBridgeMeta(view) {
			bridge[key] = value
		}
		mergedTools := s.mergeAccessoryTools([]map[string]any{})
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    s.injectAlwaysOnStatus(mergedTools),
			"bridge":  bridge,
		})
		return
	}

	mergedTools := s.mergeAccessoryTools(fallbackMCPTools(summary.InstalledHarnesses))
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    s.injectAlwaysOnStatus(mergedTools),
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.listTools",
			"reason":    "upstream unavailable; using local MCP tool inventory",
		},
	})
}

func (s *Server) handleMCPSearchTools(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	payload := map[string]any{"query": query}
	if profile := strings.TrimSpace(r.URL.Query().Get("profile")); profile != "" {
		payload["profile"] = profile
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.searchTools", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.searchTools",
			},
		})
		return
	}

	view, invErr := s.localMCPInventoryView()
	if invErr == nil && view != nil && len(view.Inventory.Tools) > 0 {
		bridge := map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.searchTools",
			"reason":    "upstream unavailable; using local MCP inventory cache",
		}
		for key, value := range inventoryBridgeMeta(view) {
			bridge[key] = value
		}
		results := fallbackSearchMCPInventoryTools(query, view, 20)
		// Also search built-in accessory tools (bash, read, write, search, etc.)
		accessoryResults := s.searchAccessoryTools(query, 20-len(results))
		results = append(results, accessoryResults...)
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    results,
			"bridge":  bridge,
		})
		return
	}

	_, _, localErr := s.localMCPSummary(r.Context())
	if localErr != nil {
		if invErr != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": localErr.Error()})
			return
		}
		bridge := map[string]any{
			"fallback": "go-local-mcp",

			"procedure": "mcp.searchTools",
			"reason":    "upstream unavailable; local MCP inventory cache is empty",
		}
		for key, value := range inventoryBridgeMeta(view) {
			bridge[key] = value
		}
		// Search built-in accessory tools even when inventory is empty
		results := s.searchAccessoryTools(query, 20)
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    results,
			"bridge":  bridge,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    s.searchAccessoryTools(query, 20),
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.searchTools",
			"reason":    "upstream unavailable; searching built-in accessory tools",
		},
	})
}

func (s *Server) handleMCPRuntimeServers(w http.ResponseWriter, r *http.Request) {
	var result any
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	upstreamBase, err := s.callUpstreamJSON(ctx, "mcp.listServers", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.listServers",
			},
		})
		return
	}

	view, invErr := s.localMCPInventoryView()
	_, summary, localErr := s.localMCPSummary(r.Context())
	if localErr != nil {
		if invErr != nil || view == nil || (view.PersistedOverlayServerCount == 0 && view.RuntimeOverlayServerCount == 0) {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": localErr.Error()})
			return
		}
		bridge := map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.listServers",
			"reason":    "upstream unavailable; using local MCP runtime overlay cache",
		}
		for key, value := range inventoryBridgeMeta(view) {
			bridge[key] = value
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    fallbackRuntimeServerListWithPrimaryProvenance(nil, view),
			"bridge":  bridge,
		})
		return
	}
	baseServers := fallbackRuntimeServerListWithPrimaryProvenance(summary.InstalledHarnesses, view)
	bridge := map[string]any{
		"fallback":  "go-local-mcp",
		"procedure": "mcp.listServers",
		"reason":    "upstream unavailable; using local MCP runtime server summary",
	}
	for key, value := range inventoryBridgeMeta(view) {
		bridge[key] = value
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    baseServers,
		"bridge":  bridge,
	})
}

func (s *Server) handleMCPPredictTools(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var payload struct {
		ChatHistory string `json:"chatHistory"`
		ActiveGoal  string `json:"activeGoal"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	// Try native Go prediction first
	predicted, err := s.mcpPredictor.PredictAndPreload(r.Context(), payload.ChatHistory, payload.ActiveGoal)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data": map[string]any{
				"predictedTools": predicted,
				"reasoning":      "Predicted via Go native predictor",
			},
			"bridge": map[string]any{
				"source": "go-native-prediction",
			},
		})
		return
	}

	// Fallback to upstream
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "mcp.predictTools", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.predictTools",
			},
		})
		return
	}

	writeJSON(w, http.StatusServiceUnavailable, map[string]any{
		"success": false,
		"error":   err.Error(),
	})
}

func (s *Server) handleMCPSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	homeDir, _ := os.UserHomeDir()
	cwd, _ := os.Getwd()
	appData := os.Getenv("APPDATA")

	targets := mcp.ResolveClientTargets(homeDir, appData, cwd)

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"targets": targets,
		},
	})
}

// handleMCPServersList returns a combined view of runtime + configured servers.
func (s *Server) handleMCPServersList(w http.ResponseWriter, r *http.Request) {
	// Cache MCP server list for 10s to reduce upstream calls
	val, err := cache.Cached(s.cacheService, "mcp:servers", func() (interface{}, error) {
		return s.buildMCPServersList(r.Context())
	}, 30000)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, val)
}

func (s *Server) buildMCPServersList(ctx context.Context) (map[string]any, error) {
	var result any
	upstreamCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	upstreamBase, err := s.callUpstreamJSON(upstreamCtx, "mcp.listServers", nil, &result)
	if err == nil {
		return map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "mcp.listServers",
			},
		}, nil
	}

	view, _ := s.localMCPInventoryView()
	_, cliSummary, _ := s.localMCPSummary(ctx)

	type serverEntry struct {
		Name      string `json:"name"`
		Status    string `json:"status"`
		ToolCount int    `json:"toolCount"`
	}

	var servers []serverEntry
	seen := make(map[string]bool)

	if view != nil {
		for name, srv := range view.PersistedOverlayRecords {
			if seen[name] {
				continue
			}
			seen[name] = true
			status := "configured"
			if srv.RuntimeConnected {
				status = "connected"
			}
			servers = append(servers, serverEntry{
				Name:      srv.Name,
				Status:    status,
				ToolCount: srv.ToolCount,
			})
		}
		for name, srv := range view.LiveOverlayRecords {
			if seen[name] {
				continue
			}
			seen[name] = true
			status := "configured"
			if srv.RuntimeConnected {
				status = "connected"
			}
			servers = append(servers, serverEntry{
				Name:      srv.Name,
				Status:    status,
				ToolCount: srv.ToolCount,
			})
		}
	}

	for _, h := range cliSummary.InstalledHarnesses {
		if seen[h.ID] {
			continue
		}
		seen[h.ID] = true
		servers = append(servers, serverEntry{
			Name:   h.ID,
			Status: "available",
		})
	}

	return map[string]any{
		"success": true,
		"data":    servers,
		"bridge": map[string]any{
			"fallback":  "go-local-mcp",
			"procedure": "mcp.listServers",
			"reason":    "upstream unavailable; using local MCP inventory",
		},
	}, nil
}

// handleMCPPredictConversational is the primary kernel endpoint called by the
// TypeScript ConversationalToolInjector before falling back to cloud LLMs.
//
// Request:  POST /api/mcp/tools/predict-conversational
//
//	{ "prompt": "...", "systemPrompt": "..." }
//
// Response: { "success": true, "data": { "tools": ["tool_name_1", ...] } }
func (s *Server) handleMCPPredictConversational(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var payload struct {
		Prompt       string `json:"prompt"`
		SystemPrompt string `json:"systemPrompt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	if strings.TrimSpace(payload.Prompt) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "prompt is required"})
		return
	}

	tools, err := s.conversationalPredictor.PredictFromPrompt(r.Context(), payload.SystemPrompt, payload.Prompt)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   err.Error(),
			"bridge":  map[string]any{"source": "go-native-ollama", "reason": "prediction failed"},
		})
		return
	}

	if tools == nil {
		tools = []string{}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"tools": tools,
		},
		"bridge": map[string]any{
			"source": "go-native-ollama",
		},
	})
}

// handleMCPConversationAppend receives an explicit conversation turn pushed by
// the TypeScript tRPC bridge or dashboard. This allows the Go-native predictor
// to build its own window independently for preemptive advertisement.
//
// Request:  POST /api/mcp/conversation/append
//
//	{ "role": "user"|"assistant"|"tool", "text": "..." }
//
// Response: { "success": true }
func (s *Server) handleMCPConversationAppend(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var payload struct {
		Role string `json:"role"`
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	role := strings.ToLower(strings.TrimSpace(payload.Role))
	if role != "user" && role != "assistant" && role != "tool" {
		role = "user"
	}
	text := strings.TrimSpace(payload.Text)
	if text == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "text is required"})
		return
	}

	s.conversationalPredictor.AppendTurn(role, text)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

// handleMCPConversationWindow returns a debug snapshot of the current
// conversational predictor sliding window.
//
// Request:  GET /api/mcp/conversation/window
//
// Response: { "success": true, "data": { "turns": [...], "tokenCount": N } }
func (s *Server) handleMCPConversationWindow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	turns := s.conversationalPredictor.WindowSnapshot()
	tokenCount := s.conversationalPredictor.WindowTokenCount()

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"turns":      turns,
			"tokenCount": tokenCount,
		},
	})
}

type AlwaysOnConfig struct {
	Tools map[string]bool `json:"tools"`
}

type NativeConfig struct {
	Tools map[string]bool `json:"tools"`
}

func (s *Server) loadAlwaysOnTools() map[string]bool {
	path := filepath.Join(s.cfg.WorkspaceRoot, "data", "always-on-tools.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return map[string]bool{}
	}
	var config AlwaysOnConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return map[string]bool{}
	}
	return config.Tools
}

func (s *Server) saveAlwaysOnTools(tools map[string]bool) error {
	path := filepath.Join(s.cfg.WorkspaceRoot, "data", "always-on-tools.json")
	config := AlwaysOnConfig{Tools: tools}
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func (s *Server) loadNativeConfig() map[string]bool {
	path := filepath.Join(s.cfg.WorkspaceRoot, "data", "native-tools.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return map[string]bool{}
	}
	var config NativeConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return map[string]bool{}
	}
	return config.Tools
}

func (s *Server) saveNativeConfig(tools map[string]bool) error {
	path := filepath.Join(s.cfg.WorkspaceRoot, "data", "native-tools.json")
	config := NativeConfig{Tools: tools}
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func (s *Server) injectAlwaysOnStatus(tools []map[string]any) []map[string]any {
	alwaysOnMap := s.loadAlwaysOnTools()
	nativeMap := s.loadNativeConfig()

	// List of high-value tools and tools native to other harnesses that must always be always-on by default
	parityTools := map[string]bool{
		// ── High-Value Chat Automation / Process Tools ──
		"list_processes":       true,
		"kill_process":         true,
		"set_chat_input":       true,
		"submit_chat_input":    true,
		"click_chat_button":    true,
		"advance_chat":         true,
		"mcp_list_servers":     true,
		"mcp_list_tools":       true,
		"mcp_call_tool":        true,
		"mcp_status":           true,
		"mcp_server_test":      true,
		"system_status":        true,
		"billing_status":       true,
		"list_accessory_tools": true,

		// ── Tools Native to Other Harnesses (Pi, Aider, Confluence, etc.) ──
		"read":                     true,
		"write":                    true,
		"edit":                     true,
		"bash":                     true,
		"grep":                     true,
		"find":                     true,
		"ls":                       true,
		"apply_search_replace":     true,
		"code_interpreter":         true,
		"cloud_troubleshoot":       true,
		"generate_devops_pipeline": true,
		"jira_create_issue":        true,
		"confluence_search":        true,
		"add_bookmark":             true,
		"launch_webview":           true,
		"get_system_stats":         true,
		"download_llamafile":       true,
	}

	for _, tool := range tools {
		name, _ := tool["name"].(string)
		isAlwaysOn := parityTools[name] || alwaysOnMap[name]
		tool["alwaysOn"] = isAlwaysOn
		tool["alwaysShow"] = isAlwaysOn

		// Determine if native status is active
		isGoNative := s.toolsRegistry != nil && s.toolsRegistry.HasTool(name)
		isNativeDisabled := nativeMap[name] == false
		tool["native"] = isGoNative && !isNativeDisabled
	}
	return tools
}

// searchAccessoryTools searches built-in accessory tools (bash, read, write, search, etc.)
// by matching query tokens against tool name and description.
func (s *Server) searchAccessoryTools(query string, limit int) []map[string]any {
	if limit <= 0 {
		return nil
	}
	qTokens := mcp.Tokenize(query)
	if len(qTokens) == 0 {
		return nil
	}
	allTools := s.mergeAccessoryTools(nil)
	results := make([]map[string]any, 0, limit)
	for _, t := range allTools {
		name, _ := t["name"].(string)
		desc, _ := t["description"].(string)
		nameTokens := mcp.Tokenize(name)
		descTokens := mcp.Tokenize(desc)
		score := 0.0
		matchReason := ""
		for _, q := range qTokens {
			for _, nt := range nameTokens {
				if strings.Contains(nt, q) {
					score += 10.0
					matchReason = "Matched tool name"
				}
			}
			for _, dt := range descTokens {
				if strings.Contains(dt, q) {
					score += 3.0
					if matchReason == "" {
						matchReason = "Matched description"
					}
				}
			}
		}
		if score > 0 {
			t["score"] = score
			t["matchReason"] = matchReason
			results = append(results, t)
			if len(results) >= limit {
				break
			}
		}
	}
	return results
}

func (s *Server) mergeAccessoryTools(toolsList []map[string]any) []map[string]any {
	seen := make(map[string]bool)
	var uniqueTools []map[string]any
	for _, t := range toolsList {
		if name, ok := t["name"].(string); ok {
			if seen[name] {
				continue
			}
			seen[name] = true
			uniqueTools = append(uniqueTools, t)
		} else {
			uniqueTools = append(uniqueTools, t)
		}
	}
	toolsList = uniqueTools

	// 1. Merge accessory tools from the root registry
	registry := roottools.NewRegistry()
	if registry != nil {
		for _, t := range registry.Tools {
			if seen[t.Name] {
				continue
			}
			seen[t.Name] = true
			var inputSchema map[string]any
			if len(t.Parameters) > 0 {
				_ = json.Unmarshal(t.Parameters, &inputSchema)
			}
			if inputSchema == nil {
				inputSchema = map[string]any{
					"type":       "object",
					"properties": map[string]any{},
				}
			}
			toolMap := map[string]any{
				"name":        t.Name,
				"description": t.Description,
				"inputSchema": inputSchema,
				"alwaysOn":    false,
				"alwaysShow":  false,
				"source":      "built-in",
			}
			toolsList = append(toolsList, toolMap)
		}
	}

	// 2. Merge Go-native internal tools (schemas from tools.NativeToolMeta)
	if s.toolsRegistry != nil {
		for _, name := range s.toolsRegistry.List() {
			if seen[name] {
				continue
			}
			seen[name] = true

			desc := "Go-native built-in tool"
			inputSchema := map[string]any{
				"type":       "object",
				"properties": map[string]any{},
			}
			if meta, hasMeta := tools.NativeToolMeta(name); hasMeta {
				if meta.Description != "" {
					desc = meta.Description
				}
				if meta.Schema != nil {
					inputSchema = map[string]any(meta.Schema)
				}
			}

			toolMap := map[string]any{
				"name":        name,
				"description": desc,
				"inputSchema": inputSchema,
				"alwaysOn":    false,
				"alwaysShow":  false,
				"source":      "native",
			}
			toolsList = append(toolsList, toolMap)
		}
	}

	return toolsList
}
