package tools

// ToolSchema is a JSON Schema fragment for a tool's arguments (MCP inputSchema).
type ToolSchema map[string]any

// ToolMeta describes a native tool for MCP tools/list.
type ToolMeta struct {
	Name        string
	Description string
	Schema      ToolSchema
}

func obj(props map[string]any, required ...string) ToolSchema {
	s := ToolSchema{
		"type":       "object",
		"properties": props,
	}
	if len(required) > 0 {
		s["required"] = required
	}
	return s
}

func str(desc string) map[string]any {
	return map[string]any{"type": "string", "description": desc}
}

func integer(desc string) map[string]any {
	return map[string]any{"type": "integer", "description": desc}
}

func number(desc string) map[string]any {
	return map[string]any{"type": "number", "description": desc}
}

func boolean(desc string) map[string]any {
	return map[string]any{"type": "boolean", "description": desc}
}

func strArray(desc string) map[string]any {
	return map[string]any{
		"type":        "array",
		"description": desc,
		"items":       map[string]any{"type": "string"},
	}
}

// NativeToolMeta returns the MCP description + inputSchema for a registered tool.
func NativeToolMeta(name string) (ToolMeta, bool) {
	meta, ok := nativeToolCatalog[name]
	return meta, ok
}

// NativeToolMetas returns the full catalog of native tool schemas.
func NativeToolMetas() []ToolMeta {
	out := make([]ToolMeta, 0, len(nativeToolCatalog))
	for _, m := range nativeToolCatalog {
		out = append(out, m)
	}
	return out
}

var nativeToolCatalog = map[string]ToolMeta{
	"echo": {
		Name:        "echo",
		Description: "Echo back a message",
		Schema:      obj(map[string]any{"message": str("Text to echo")}, "message"),
	},
	"hello_world": {
		Name:        "hello_world",
		Description: "Return a greeting message",
		Schema:      obj(map[string]any{"name": str("Name to greet (default World)")}),
	},
	"codebase_search": {
		Name:        "codebase_search",
		Description: "Search codebase symbols, definitions, or references via the repo graph",
		Schema: obj(map[string]any{
			"query": str("Search term or symbol name"),
			"mode":  str("symbols | definitions | references (default symbols)"),
			"limit": integer("Max results (default 20)"),
		}, "query"),
	},
	"codebase_outline": {
		Name:        "codebase_outline",
		Description: "Outline symbols defined in a file or detail a specific symbol",
		Schema: obj(map[string]any{
			"filePath":   str("Path to source file"),
			"symbolName": str("Symbol name to outline"),
		}),
	},
	"add_memory": {
		Name:        "add_memory",
		Description: "Store a structured memory in the L2 vector vault",
		Schema: obj(map[string]any{
			"content":     str("Memory content (required)"),
			"tags":        str("Comma-separated tags"),
			"category":    str("Category (default general)"),
			"importance":  number("Importance 0-1 (default 0.5)"),
			"session_id":  str("Session identifier"),
		}, "content"),
	},
	"search_memory": {
		Name:        "search_memory",
		Description: "Search L2 vault memories by keyword with optional tag/category filters",
		Schema: obj(map[string]any{
			"query":         str("Search query (empty returns recent)"),
			"tag":           str("Filter by tag substring"),
			"category":      str("Filter by category"),
			"limit":         integer("Max results (default 20)"),
			"offset":        integer("Result offset"),
			"include_cold":  boolean("Include L3 cold-archive hits"),
		}),
	},
	"delete_memory": {
		Name:        "delete_memory",
		Description: "Delete an L2 vault memory by ID",
		Schema:      obj(map[string]any{"id": str("Memory ID to delete")}, "id"),
	},
	"memory_stats": {
		Name:        "memory_stats",
		Description: "Return counts across L2 vault / scratchpad / relation tiers",
		Schema:      obj(map[string]any{}),
	},
	"memory_scratchpad_get": {
		Name:        "memory_scratchpad_get",
		Description: "Retrieve a core memory scratchpad value by key",
		Schema:      obj(map[string]any{"key": str("Key to retrieve")}, "key"),
	},
	"memory_scratchpad_set": {
		Name:        "memory_scratchpad_set",
		Description: "Write or overwrite a core memory scratchpad value",
		Schema:      obj(map[string]any{"key": str("Key to set"), "value": str("Value to write")}, "key", "value"),
	},
	"memory_scratchpad_append": {
		Name:        "memory_scratchpad_append",
		Description: "Append text to an existing core memory scratchpad value",
		Schema:      obj(map[string]any{"key": str("Key to append to"), "value": str("Text to append")}, "key", "value"),
	},
	"memory_extract_relations": {
		Name:        "memory_extract_relations",
		Description: "Extract entities and relationships from a text block and store GraphRAG edges",
		Schema:      obj(map[string]any{"text": str("Text block to extract relations from")}, "text"),
	},
	"memory_extract_relations_batch": {
		Name:        "memory_extract_relations_batch",
		Description: "Extract GraphRAG relations across the L2 vault corpus",
		Schema:      obj(map[string]any{"limit": integer("Max memories to scan (default 100)")}),
	},
	"bash": {
		Name:        "bash",
		Description: "Execute a shell command and return combined stdout/stderr",
		Schema:      obj(map[string]any{"command": str("Shell command to run")}, "command"),
	},
	"ls": {
		Name:        "ls",
		Description: "List directory contents",
		Schema: obj(map[string]any{
			"path":  str("Directory path (default .)"),
			"limit": integer("Max entries (default 50)"),
		}),
	},
	"read": {
		Name:        "read",
		Description: "Read a file's contents",
		Schema:      obj(map[string]any{"path": str("Absolute or relative file path")}, "path"),
	},
	"write": {
		Name:        "write",
		Description: "Create or overwrite a file with contents",
		Schema:      obj(map[string]any{"path": str("File path"), "content": str("Content to write")}, "path", "content"),
	},
	"grep": {
		Name:        "grep",
		Description: "Search file contents for a literal substring under a directory",
		Schema: obj(map[string]any{
			"pattern": str("Search pattern"),
			"path":    str("Root directory (default .)"),
		}, "pattern"),
	},
	"find": {
		Name:        "find",
		Description: "Find files by glob pattern",
		Schema: obj(map[string]any{
			"pattern": str("Glob pattern, e.g. **/*.go"),
			"limit":   integer("Max matches (default 50)"),
		}, "pattern"),
	},
	"repomap": {
		Name:        "repomap",
		Description: "Generate a ranked repository map with symbol summaries",
		Schema: obj(map[string]any{
			"dir":            str("Repository root (default .)"),
			"max_files":      integer("Max files to include (default 40)"),
			"include_tests":  boolean("Include test files"),
			"mention_file":   strArray("Files to boost"),
			"mention_ident":  strArray("Identifiers to boost"),
		}),
	},
	"get_system_stats": {
		Name:        "get_system_stats",
		Description: "Return real-time host/memory/goroutine metrics",
		Schema:      obj(map[string]any{}),
	},
	"apply_search_replace": {
		Name:        "apply_search_replace",
		Description: "Apply an exact search/replace block to a file",
		Schema: obj(map[string]any{
			"file_path":     str("Target file"),
			"search_block":  str("Exact text to find"),
			"replace_block": str("Replacement text"),
		}, "file_path", "search_block"),
	},
	"launch_webview": {
		Name:        "launch_webview",
		Description: "Open a URL in the system browser",
		Schema:      obj(map[string]any{"url": str("URL to open")}, "url"),
	},
	"add_bookmark": {
		Name:        "add_bookmark",
		Description: "Save a URL bookmark with title and tags",
		Schema: obj(map[string]any{
			"title": str("Bookmark title"),
			"url":   str("Bookmark URL"),
			"tags":  strArray("Tags"),
		}, "title", "url"),
	},
	"cloud_troubleshoot": {
		Name:        "cloud_troubleshoot",
		Description: "Diagnose cloud infrastructure issues from a resource ID and error log",
		Schema: obj(map[string]any{
			"resource_id": str("Cloud resource identifier"),
			"error_log":   str("Error log excerpt"),
		}, "resource_id"),
	},
	"generate_devops_pipeline": {
		Name:        "generate_devops_pipeline",
		Description: "Generate a CI/CD pipeline skeleton",
		Schema: obj(map[string]any{
			"platform":     str("github_actions | gitlab_ci | jenkins"),
			"project_type": str("Project type, e.g. go, node"),
		}, "platform"),
	},
	"jira_create_issue": {
		Name:        "jira_create_issue",
		Description: "Create a Jira issue",
		Schema: obj(map[string]any{
			"project_key": str("Jira project key"),
			"summary":     str("Issue summary"),
			"description": str("Issue description"),
		}, "project_key", "summary"),
	},
	"confluence_search": {
		Name:        "confluence_search",
		Description: "Search Confluence documentation",
		Schema:      obj(map[string]any{"query": str("Search query")}, "query"),
	},
	"download_llamafile": {
		Name:        "download_llamafile",
		Description: "Download a standalone model binary to a local path",
		Schema: obj(map[string]any{
			"url":       str("Download URL"),
			"dest_path": str("Destination file path"),
		}, "url", "dest_path"),
	},
	"list_processes": {
		Name:        "list_processes",
		Description: "List active system processes with PID and memory",
		Schema:      obj(map[string]any{}),
	},
	"kill_process": {
		Name:        "kill_process",
		Description: "Force-terminate a process by PID",
		Schema:      obj(map[string]any{"pid": integer("Process ID to kill")}, "pid"),
	},
	"detect_chat_state": {
		Name:        "detect_chat_state",
		Description: "Detect whether the active chat window is waiting for input or has action buttons",
		Schema: obj(map[string]any{
			"processName":  str("Optional process name filter"),
			"windowTitle":  str("Optional partial window title"),
			"surfaceOverride": str("Optional surface profile id"),
		}),
	},
	"detect_chat_surface": {
		Name:        "detect_chat_surface",
		Description: "Inspect the active window and classify the chat surface",
		Schema: obj(map[string]any{
			"processName":  str("Optional process name"),
			"windowTitle":  str("Optional partial window title"),
			"surfaceOverride": str("Optional surface profile id"),
		}),
	},
	"list_surface_profiles": {
		Name:        "list_surface_profiles",
		Description: "List known supervisor surface profiles and their action labels",
		Schema:      obj(map[string]any{}),
	},
	"get_supervisor_settings": {
		Name:        "get_supervisor_settings",
		Description: "Get supervisor autopilot defaults (bump text, action labels, delays)",
		Schema:      obj(map[string]any{}),
	},
}
