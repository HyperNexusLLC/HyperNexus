package mcp

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// SupportedClient represents an AI tool that supports MCP
type SupportedClient string

const (
	// Tier 1: Major AI tools
	ClaudeDesktop SupportedClient = "claude-desktop"
	ClaudeCode    SupportedClient = "claude-code"
	Cursor        SupportedClient = "cursor"
	VSCode        SupportedClient = "vscode"
	Windsurf      SupportedClient = "windsurf"
	Gemini        SupportedClient = "gemini"
	Copilot       SupportedClient = "copilot"

	// Tier 2: Popular coding assistants
	Aider        SupportedClient = "aider"
	Continue     SupportedClient = "continue"
	Cline        SupportedClient = "cline"
	Roo          SupportedClient = "roo"
	OpenHands    SupportedClient = "openhands"
	Factory      SupportedClient = "factory"
	CodeWhale    SupportedClient = "codewhale"

	// Tier 3: Emerging tools
	Goose        SupportedClient = "goose"
	IFlow        SupportedClient = "iflow"
	OpenCode     SupportedClient = "opencode"
	OpenClaw     SupportedClient = "openclaw"
	Antigravity  SupportedClient = "antigravity"
	Trae         SupportedClient = "trae"
	Zed          SupportedClient = "zed"
	Kiro         SupportedClient = "kiro"

	// Tier 4: Specialized tools
	Codex        SupportedClient = "codex"
	Grok         SupportedClient = "grok"
	Qwen         SupportedClient = "qwen"
	QwenCode     SupportedClient = "qwen-code"
	KimiCode     SupportedClient = "kimi-code"
	Moonshot     SupportedClient = "moonshot"
	Pi           SupportedClient = "pi"
	Hermes       SupportedClient = "hermes"

	// Tier 5: Enterprise/team tools
	Omnigent     SupportedClient = "omnigent"
	Citadel      SupportedClient = "citadel"
	AgentFusion  SupportedClient = "agent-fusion"
	Herdr        SupportedClient = "herdr"
	ClaudeSquad  SupportedClient = "claude-squad"
	Cliproxyapi  SupportedClient = "cliproxyapi"
	JetBrains    SupportedClient = "jetbrains"
)

// AllClients returns all supported clients
func AllClients() []SupportedClient {
	return []SupportedClient{
		// Tier 1
		ClaudeDesktop, ClaudeCode, Cursor, VSCode, Windsurf, Gemini, Copilot,
		// Tier 2
		Aider, Continue, Cline, Roo, OpenHands, Factory, CodeWhale,
		// Tier 3
		Goose, IFlow, OpenCode, OpenClaw, Antigravity, Trae, Zed, Kiro,
		// Tier 4
		Codex, Grok, Qwen, QwenCode, KimiCode, Moonshot, Pi, Hermes,
		// Tier 5
		Omnigent, Citadel, AgentFusion, Herdr, ClaudeSquad, Cliproxyapi, JetBrains,
	}
}

// ResolvedTarget represents a resolved MCP config target
type ResolvedTarget struct {
	Client     SupportedClient `json:"client"`
	Path       string          `json:"path"`
	Candidates []string        `json:"candidates"`
	Exists     bool            `json:"exists"`
}

// SyncResult represents the result of syncing MCP config to a client
type SyncResult struct {
	Client      SupportedClient `json:"client"`
	TargetPath  string          `json:"targetPath"`
	ServerCount int             `json:"serverCount"`
	Written     bool            `json:"written"`
}

// ResolveClientTargets resolves all possible MCP config targets for all clients
func ResolveClientTargets(homeDir string, appData string, cwd string) []ResolvedTarget {
	var results []ResolvedTarget

	for _, client := range AllClients() {
		candidates := getClientCandidates(client, homeDir, appData, cwd)
		var existingPath string
		exists := false

		for _, c := range candidates {
			if _, err := os.Stat(c); err == nil {
				existingPath = c
				exists = true
				break
			}
		}

		if !exists && len(candidates) > 0 {
			existingPath = candidates[0]
		}

		results = append(results, ResolvedTarget{
			Client:     client,
			Path:       existingPath,
			Candidates: candidates,
			Exists:     exists,
		})
	}

	return results
}

// getClientCandidates returns all possible config file paths for a client
func getClientCandidates(client SupportedClient, homeDir string, appData string, cwd string) []string {
	if appData == "" {
		if runtime.GOOS == "windows" {
			appData = filepath.Join(homeDir, "AppData", "Roaming")
		}
	}

	switch client {
	// ─── Tier 1: Major AI tools ──────────────────────────────────────────
	case ClaudeDesktop:
		return byPlatform(
			[]string{filepath.Join(appData, "Claude", "claude_desktop_config.json")},
			[]string{filepath.Join(homeDir, "Library", "Application Support", "Claude", "claude_desktop_config.json")},
			[]string{filepath.Join(homeDir, ".config", "Claude", "claude_desktop_config.json")},
		)
	case ClaudeCode:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".claude", "settings.json")},
			[]string{filepath.Join(homeDir, ".claude", "settings.json")},
			[]string{filepath.Join(homeDir, ".claude", "settings.json")},
		)
	case Cursor:
		return byPlatform(
			[]string{
				filepath.Join(appData, "Cursor", "User", "globalStorage", "mcp-servers.json"),
				filepath.Join(appData, "Cursor", "User", "mcp.json"),
			},
			[]string{
				filepath.Join(homeDir, "Library", "Application Support", "Cursor", "User", "globalStorage", "mcp-servers.json"),
				filepath.Join(homeDir, "Library", "Application Support", "Cursor", "User", "mcp.json"),
			},
			[]string{
				filepath.Join(homeDir, ".config", "Cursor", "User", "globalStorage", "mcp-servers.json"),
				filepath.Join(homeDir, ".config", "Cursor", "User", "mcp.json"),
			},
		)
	case VSCode:
		return byPlatform(
			[]string{
				filepath.Join(appData, "Code", "User", "globalStorage", "mcp-servers.json"),
				filepath.Join(appData, "Code", "User", "settings.json"),
				filepath.Join(cwd, ".vscode", "mcp.json"),
			},
			[]string{
				filepath.Join(homeDir, "Library", "Application Support", "Code", "User", "globalStorage", "mcp-servers.json"),
				filepath.Join(homeDir, "Library", "Application Support", "Code", "User", "settings.json"),
				filepath.Join(cwd, ".vscode", "mcp.json"),
			},
			[]string{
				filepath.Join(homeDir, ".config", "Code", "User", "globalStorage", "mcp-servers.json"),
				filepath.Join(homeDir, ".config", "Code", "User", "settings.json"),
				filepath.Join(cwd, ".vscode", "mcp.json"),
			},
		)
	case Windsurf:
		return byPlatform(
			[]string{filepath.Join(appData, "Windsurf", "User", "mcp.json")},
			[]string{filepath.Join(homeDir, "Library", "Application Support", "Windsurf", "User", "mcp.json")},
			[]string{filepath.Join(homeDir, ".config", "Windsurf", "User", "mcp.json")},
		)
	case Gemini:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".gemini", "settings.json")},
			[]string{filepath.Join(homeDir, ".gemini", "settings.json")},
			[]string{filepath.Join(homeDir, ".gemini", "settings.json")},
		)
	case Copilot:
		return byPlatform(
			[]string{filepath.Join(appData, "GitHub Copilot", "mcp.json")},
			[]string{filepath.Join(homeDir, "Library", "Application Support", "GitHub Copilot", "mcp.json")},
			[]string{filepath.Join(homeDir, ".config", "github-copilot", "mcp.json")},
		)

	// ─── Tier 2: Popular coding assistants ───────────────────────────────
	case Aider:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".aider", "mcp.json")},
			[]string{filepath.Join(homeDir, ".aider", "mcp.json")},
			[]string{filepath.Join(homeDir, ".aider", "mcp.json")},
		)
	case Continue:
		return byPlatform(
			[]string{filepath.Join(appData, "Continue", "config.json")},
			[]string{filepath.Join(homeDir, ".continue", "config.json")},
			[]string{filepath.Join(homeDir, ".continue", "config.json")},
		)
	case Cline:
		return byPlatform(
			[]string{filepath.Join(appData, "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json")},
			[]string{filepath.Join(homeDir, "Library", "Application Support", "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json")},
			[]string{filepath.Join(homeDir, ".config", "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json")},
		)
	case Roo:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".roo", "mcp.json")},
			[]string{filepath.Join(homeDir, ".roo", "mcp.json")},
			[]string{filepath.Join(homeDir, ".roo", "mcp.json")},
		)
	case OpenHands:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".openhands", "mcp.json")},
			[]string{filepath.Join(homeDir, ".openhands", "mcp.json")},
			[]string{filepath.Join(homeDir, ".openhands", "mcp.json")},
		)
	case Factory:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".factory", "mcp.json")},
			[]string{filepath.Join(homeDir, ".factory", "mcp.json")},
			[]string{filepath.Join(homeDir, ".factory", "mcp.json")},
		)
	case CodeWhale:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".codewhale", "mcp.json")},
			[]string{filepath.Join(homeDir, ".codewhale", "mcp.json")},
			[]string{filepath.Join(homeDir, ".codewhale", "mcp.json")},
		)

	// ─── Tier 3: Emerging tools ──────────────────────────────────────────
	case Goose:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".goose", "mcp.json")},
			[]string{filepath.Join(homeDir, ".goose", "mcp.json")},
			[]string{filepath.Join(homeDir, ".goose", "mcp.json")},
		)
	case IFlow:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".iflow", "mcp.json")},
			[]string{filepath.Join(homeDir, ".iflow", "mcp.json")},
			[]string{filepath.Join(homeDir, ".iflow", "mcp.json")},
		)
	case OpenCode:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".opencode", "mcp.json")},
			[]string{filepath.Join(homeDir, ".opencode", "mcp.json")},
			[]string{filepath.Join(homeDir, ".opencode", "mcp.json")},
		)
	case OpenClaw:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".openclaw", "mcp.json")},
			[]string{filepath.Join(homeDir, ".openclaw", "mcp.json")},
			[]string{filepath.Join(homeDir, ".openclaw", "mcp.json")},
		)
	case Antigravity:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".antigravity", "mcp.json")},
			[]string{filepath.Join(homeDir, ".antigravity", "mcp.json")},
			[]string{filepath.Join(homeDir, ".antigravity", "mcp.json")},
		)
	case Trae:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".trae", "mcp.json")},
			[]string{filepath.Join(homeDir, ".trae", "mcp.json")},
			[]string{filepath.Join(homeDir, ".trae", "mcp.json")},
		)
	case Zed:
		return byPlatform(
			[]string{filepath.Join(appData, "Zed", "settings.json")},
			[]string{filepath.Join(homeDir, ".config", "zed", "settings.json")},
			[]string{filepath.Join(homeDir, ".config", "zed", "settings.json")},
		)
	case Kiro:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".kiro", "mcp.json")},
			[]string{filepath.Join(homeDir, ".kiro", "mcp.json")},
			[]string{filepath.Join(homeDir, ".kiro", "mcp.json")},
		)

	// ─── Tier 4: Specialized tools ───────────────────────────────────────
	case Codex:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".codex", "mcp.json")},
			[]string{filepath.Join(homeDir, ".codex", "mcp.json")},
			[]string{filepath.Join(homeDir, ".codex", "mcp.json")},
		)
	case Grok:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".grok", "mcp.json")},
			[]string{filepath.Join(homeDir, ".grok", "mcp.json")},
			[]string{filepath.Join(homeDir, ".grok", "mcp.json")},
		)
	case Qwen:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".qwen", "mcp.json")},
			[]string{filepath.Join(homeDir, ".qwen", "mcp.json")},
			[]string{filepath.Join(homeDir, ".qwen", "mcp.json")},
		)
	case QwenCode:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".qwen-code", "mcp.json")},
			[]string{filepath.Join(homeDir, ".qwen-code", "mcp.json")},
			[]string{filepath.Join(homeDir, ".qwen-code", "mcp.json")},
		)
	case KimiCode:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".kimi-code", "mcp.json")},
			[]string{filepath.Join(homeDir, ".kimi-code", "mcp.json")},
			[]string{filepath.Join(homeDir, ".kimi-code", "mcp.json")},
		)
	case Moonshot:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".moonshot", "mcp.json")},
			[]string{filepath.Join(homeDir, ".moonshot", "mcp.json")},
			[]string{filepath.Join(homeDir, ".moonshot", "mcp.json")},
		)
	case Pi:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".pi", "mcp.json")},
			[]string{filepath.Join(homeDir, ".pi", "mcp.json")},
			[]string{filepath.Join(homeDir, ".pi", "mcp.json")},
		)
	case Hermes:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".hermes", "mcp.json")},
			[]string{filepath.Join(homeDir, ".hermes", "mcp.json")},
			[]string{filepath.Join(homeDir, ".hermes", "mcp.json")},
		)

	// ─── Tier 5: Enterprise/team tools ───────────────────────────────────
	case Omnigent:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".omnigent", "mcp.json")},
			[]string{filepath.Join(homeDir, ".omnigent", "mcp.json")},
			[]string{filepath.Join(homeDir, ".omnigent", "mcp.json")},
		)
	case Citadel:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".citadel", "mcp.json")},
			[]string{filepath.Join(homeDir, ".citadel", "mcp.json")},
			[]string{filepath.Join(homeDir, ".citadel", "mcp.json")},
		)
	case AgentFusion:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".agent-fusion", "mcp.json")},
			[]string{filepath.Join(homeDir, ".agent-fusion", "mcp.json")},
			[]string{filepath.Join(homeDir, ".agent-fusion", "mcp.json")},
		)
	case Herdr:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".herdr", "mcp.json")},
			[]string{filepath.Join(homeDir, ".herdr", "mcp.json")},
			[]string{filepath.Join(homeDir, ".herdr", "mcp.json")},
		)
	case ClaudeSquad:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".claude-squad", "mcp.json")},
			[]string{filepath.Join(homeDir, ".claude-squad", "mcp.json")},
			[]string{filepath.Join(homeDir, ".claude-squad", "mcp.json")},
		)
	case Cliproxyapi:
		return byPlatform(
			[]string{filepath.Join(homeDir, ".cliproxyapi", "mcp.json")},
			[]string{filepath.Join(homeDir, ".cliproxyapi", "mcp.json")},
			[]string{filepath.Join(homeDir, ".cliproxyapi", "mcp.json")},
		)
	case JetBrains:
		return byPlatform(
			[]string{filepath.Join(appData, "JetBrains", "mcp.json")},
			[]string{filepath.Join(homeDir, "Library", "Application Support", "JetBrains", "mcp.json")},
			[]string{filepath.Join(homeDir, ".config", "JetBrains", "mcp.json")},
		)
	}
	return nil
}

// byPlatform returns the appropriate paths based on the current OS
func byPlatform(win, mac, linux []string) []string {
	switch runtime.GOOS {
	case "windows":
		return win
	case "darwin":
		return mac
	default:
		return linux
	}
}

// SyncToClient syncs MCP server config to a specific client
func SyncToClient(client SupportedClient, targetPath string, servers map[string]McpServerConfig) (*SyncResult, error) {
	// 1. Read existing config
	existing := make(map[string]interface{})
	if data, err := os.ReadFile(targetPath); err == nil {
		_ = json.Unmarshal(data, &existing)
	}

	// 2. Prepare new mcpServers block
	mcpServers := make(map[string]interface{})
	for name, cfg := range servers {
		if cfg.Command != "" {
			// Stdio Server
			def := map[string]interface{}{
				"command": cfg.Command,
			}
			if len(cfg.Args) > 0 {
				def["args"] = cfg.Args
			}
			if len(cfg.Env) > 0 {
				def["env"] = cfg.Env
			}
			mcpServers[name] = def
		} else if cfg.URL != "" {
			// HTTP/SSE Server
			def := map[string]interface{}{
				"url": cfg.URL,
			}

			headers := make(map[string]string)
			for k, v := range cfg.Headers {
				headers[k] = v
			}
			if cfg.BearerToken != "" {
				headers["Authorization"] = "Bearer " + cfg.BearerToken
			}

			if len(headers) > 0 {
				def["headers"] = headers
			}
			mcpServers[name] = def
		}
	}

	// 3. Merge or Replace
	// Some tools like Cursor store MCP servers in a sub-property, others top-level
	if client == VSCode && strings.HasSuffix(targetPath, "settings.json") {
		existing["mcp.servers"] = mcpServers
	} else {
		existing["mcpServers"] = mcpServers
	}

	// 4. Write
	data, err := json.MarshalIndent(existing, "", "  ")
	if err != nil {
		return nil, err
	}

	if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
		return nil, err
	}

	if err := os.WriteFile(targetPath, data, 0644); err != nil {
		return nil, err
	}

	return &SyncResult{
		Client:      client,
		TargetPath:  targetPath,
		ServerCount: len(mcpServers),
		Written:     true,
	}, nil
}
