package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/memorystore"
	"gitlab.com/HyperNexusLLC/HyperNexus/internal/repograph"
)

var GlobalVectorStore *memorystore.VectorStore
var GlobalRepoGraph *repograph.RepoGraphService

type ToolResponse struct {
	Content []TextContent `json:"content"`
	IsError bool          `json:"isError,omitempty"`
}

type TextContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

func ok(text string) (ToolResponse, error) {
	return ToolResponse{
		Content: []TextContent{{Type: "text", Text: text}},
	}, nil
}

func err(msg string) (ToolResponse, error) {
	return ToolResponse{}, fmt.Errorf("%s", msg)
}

func getString(args map[string]interface{}, key string) (string, bool) {
	if v, ok := args[key]; ok {
		if s, ok := v.(string); ok {
			return s, true
		}
	}
	return "", false
}

func getInt(args map[string]interface{}, key string) (int, bool) {
	if v, ok := args[key]; ok {
		switch val := v.(type) {
		case float64:
			return int(val), true
		case int:
			return val, true
		}
	}
	return 0, false
}

func getFloat(args map[string]interface{}, key string) (float64, bool) {
	v, ok := args[key]
	if !ok {
		return 0, false
	}
	switch n := v.(type) {
	case float64:
		return n, true
	case int:
		return float64(n), true
	}
	return 0, false
}

func getBool(args map[string]interface{}, key string) (bool, bool) {
	if v, ok := args[key]; ok {
		if b, ok := v.(bool); ok {
			return b, true
		}
	}
	return false, false
}

type ToolHandler func(ctx context.Context, args map[string]interface{}) (ToolResponse, error)

type Registry struct {
	mu       sync.RWMutex
	handlers map[string]ToolHandler
}

func NewRegistry() *Registry {
	r := &Registry{
		handlers: make(map[string]ToolHandler),
	}
	// Built-in tools — handlers are in server.go (the only clean handler file).
	// Additional tools are served via the MCP server (mcp_server.go) and
	// mcpimpl dispatch (5,400+ generated handlers).
	r.Register("echo", HandleEcho)
	r.Register("hello_world", HandleHelloWorld)
	r.Register("codebase_search", HandleCodebaseSearch)
	r.Register("codebase_outline", HandleCodebaseOutline)
	// TN-native memory tools — same backend as /api/memory/* HTTP API and tn_memory_store pi extension
	r.Register("add_memory", HandleAddMemory)
	r.Register("search_memory", HandleSearchMemory)
	r.Register("delete_memory", HandleDeleteMemory)
	r.Register("memory_stats", HandleMemoryStats)
	// Core memory scratchpad tools — Letta-style key/value store backed by GlobalVectorStore
	r.Register("memory_scratchpad_get", HandleScratchpadGet)
	r.Register("memory_scratchpad_set", HandleScratchpadSet)
	r.Register("memory_scratchpad_append", HandleScratchpadAppend)
	r.Register("memory_extract_relations", HandleExtractRelations)
	r.Register("memory_extract_relations_batch", HandleExtractRelationsBatch)
	// Core I/O tools — accessible via POST /api/agent/tool
	r.Register("bash", HandleBash)
	r.Register("run_shell_command", HandleRunShellCommand)
	r.Register("ls", HandleListDir)
	r.Register("read", HandleReadFile)
	r.Register("read_file", HandleReadFileAlias)
	r.Register("write", HandleWriteFile)
	r.Register("write_file", HandleWriteFileAlias)
	r.Register("edit", HandleEdit)
	r.Register("search", HandleSearchFiles)
	r.Register("grep", HandleGrep)
	r.Register("find", HandleFind)
	r.Register("code_interpreter", HandleCodeInterpreter)
	r.Register("install_mcp_server", HandleInstallMCPServer)
	r.Register("repomap", HandleRepomap)
	// System & utility tools
	r.Register("get_system_stats", HandleGetSystemStats)
	// Kernel-bridging MCP tools — identical output to the stdio MCP server
	// implementations (cmd/tormentnexus/mcp_server.go), reachable through the
	// HTTP tool router (/api/agent/tool) as well.
	r.Register("mcp_status", HandleMCPStatus)
	r.Register("mcp_list_servers", HandleMCPServersList)
	r.Register("mcp_list_tools", HandleMCPListTools)
	r.Register("mcp_call_tool", HandleMCPCallTool)
	r.Register("mcp_server_test", HandleMCPServerTest)
	r.Register("inspect_window_ui", HandleInspectWindowUI)
	// Stdio↔router parity for the remaining console/autopilot tools.
	r.Register("billing_status", HandleBillingStatus)
	r.Register("system_status", HandleSystemStatus)
	r.Register("list_accessory_tools", HandleListAccessoryTools)
	r.Register("update_supervisor_settings", HandleUpdateSupervisorSettings)
	r.Register("click_chat_button", HandleClickChatButton)
	r.Register("click_action_buttons", HandleClickActionButtons)
	r.Register("set_chat_input", HandleSetChatInput)
	r.Register("submit_chat_input", HandleSubmitChatInput)
	r.Register("simulate_input", HandleSimulateInput)
	r.Register("advance_chat", HandleAdvanceChat)
	r.Register("apply_search_replace", HandleApplySearchReplace)
	r.Register("launch_webview", HandleLaunchWebview)
	r.Register("add_bookmark", HandleAddBookmark)
	r.Register("cloud_troubleshoot", HandleCloudTroubleshoot)
	r.Register("generate_devops_pipeline", HandleGenerateDevopsPipeline)
	r.Register("jira_create_issue", HandleJiraCreateIssue)
	r.Register("confluence_search", HandleConfluenceSearch)
	r.Register("download_llamafile", HandleDownloadLlamafile)
	// Supervisor tools
	r.Register("list_processes", HandleListProcesses)
	r.Register("kill_process", HandleKillProcess)
	r.Register("detect_chat_state", HandleDetectChatState)
	r.Register("detect_chat_surface", HandleDetectChatSurface)
	r.Register("list_surface_profiles", HandleListSurfaceProfiles)
	r.Register("get_supervisor_settings", HandleGetSupervisorSettings)
	return r
}

func (r *Registry) Register(name string, handler ToolHandler) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.handlers[name] = handler
}

func (r *Registry) Execute(ctx context.Context, name string, args map[string]interface{}) (ToolResponse, error) {
	r.mu.RLock()
	handler, ok := r.handlers[name]
	r.mu.RUnlock()
	if !ok {
		return ToolResponse{}, fmt.Errorf("unknown tool: %s", name)
	}
	return handler(ctx, args)
}

func (r *Registry) HasTool(name string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	_, ok := r.handlers[name]
	return ok
}

func (r *Registry) List() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	names := make([]string, 0, len(r.handlers))
	for name := range r.handlers {
		names = append(names, name)
	}
	return names
}

// Schema returns the MCP inputSchema for a registered native tool.
func (r *Registry) Schema(name string) (ToolSchema, bool) {
	meta, ok := NativeToolMeta(name)
	if !ok {
		return ToolSchema{"type": "object", "properties": map[string]any{}}, false
	}
	return meta.Schema, true
}

// Describe returns name/description/inputSchema for a registered native tool.
func (r *Registry) Describe(name string) (ToolMeta, bool) {
	return NativeToolMeta(name)
}

var _ = json.Marshal
