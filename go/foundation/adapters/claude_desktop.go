package adapters

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// ClaudeDesktopConfig represents the Claude Desktop configuration file
type ClaudeDesktopConfig struct {
	MCPServers map[string]MCPServerConfig `json:"mcpServers"`
	// Preserve other fields
	Extra map[string]interface{} `json:"-"`
}

// UnmarshalJSON custom unmarshaler to preserve unknown fields
func (c *ClaudeDesktopConfig) UnmarshalJSON(data []byte) error {
	// First unmarshal into a map to preserve all fields
	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	// Extract mcpServers
	if servers, ok := raw["mcpServers"].(map[string]interface{}); ok {
		c.MCPServers = make(map[string]MCPServerConfig)
		for name, server := range servers {
			serverBytes, err := json.Marshal(server)
			if err != nil {
				continue
			}
			var config MCPServerConfig
			if err := json.Unmarshal(serverBytes, &config); err != nil {
				continue
			}
			c.MCPServers[name] = config
		}
		delete(raw, "mcpServers")
	}

	// Store remaining fields
	c.Extra = raw
	return nil
}

// MarshalJSON custom marshaler to include all fields
func (c *ClaudeDesktopConfig) MarshalJSON() ([]byte, error) {
	// Start with the extra fields
	result := make(map[string]interface{})
	for k, v := range c.Extra {
		result[k] = v
	}
	// Add mcpServers
	result["mcpServers"] = c.MCPServers
	return json.MarshalIndent(result, "", "  ")
}

// GetClaudeDesktopConfigPath returns the path to Claude Desktop's config file
func GetClaudeDesktopConfigPath() (string, error) {
	var configDir string

	switch runtime.GOOS {
	case "windows":
		appData := os.Getenv("APPDATA")
		if appData == "" {
			return "", fmt.Errorf("APPDATA environment variable not set")
		}
		configDir = filepath.Join(appData, "Claude")
	case "darwin":
		home, _ := os.UserHomeDir()
		configDir = filepath.Join(home, "Library", "Application Support", "Claude")
	case "linux":
		home, _ := os.UserHomeDir()
		configDir = filepath.Join(home, ".config", "claude")
	default:
		return "", fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}

	return filepath.Join(configDir, "claude_desktop_config.json"), nil
}

// InjectMCPIntoClaudeDesktop injects the HyperNexus MCP server config into Claude Desktop
func InjectMCPIntoClaudeDesktop(exePath string) error {
	configPath, err := GetClaudeDesktopConfigPath()
	if err != nil {
		return fmt.Errorf("failed to get Claude Desktop config path: %w", err)
	}

	// Check if Claude Desktop directory exists
	configDir := filepath.Dir(configPath)
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		return fmt.Errorf("Claude Desktop not found at %s", configDir)
	}

	// Read existing config or create new one
	var config ClaudeDesktopConfig
	config.MCPServers = make(map[string]MCPServerConfig)

	if data, err := os.ReadFile(configPath); err == nil {
		// Try to parse existing config
		if err := json.Unmarshal(data, &config); err != nil {
			// If parsing fails, start fresh but backup the old file
			backupPath := configPath + ".backup"
			os.Rename(configPath, backupPath)
		}
	}

	// Normalize the exe path (use forward slashes for JSON)
	normalizedPath := strings.ReplaceAll(exePath, "\\", "/")

	// Add or update HyperNexus MCP server config
	config.MCPServers["hypernexus"] = MCPServerConfig{
		Command: normalizedPath,
		Args:    []string{"mcp"},
		Env: map[string]string{
			"HN_EDITION":                  "corporate",
			"HN_CLOUD_ENDPOINT":           "https://cloud.hypernexus.site",
			"HN_UPDATE_URL":               "https://releases.hypernexus.site/latest/version.json",
			"TORMENTNEXUS_WORKSPACE_ROOT": getWorkspaceRoot(),
		},
	}

	// Marshal with proper formatting
	output, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	// Write config file
	if err := os.WriteFile(configPath, output, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// InstallClaudeDesktopExtension installs the HyperNexus extension for Claude Desktop
func InstallClaudeDesktopExtension() error {
	configPath, err := GetClaudeDesktopConfigPath()
	if err != nil {
		return err
	}

	configDir := filepath.Dir(configPath)
	extensionDir := filepath.Join(configDir, "extensions", "hypernexus")
	skillsDir := filepath.Join(extensionDir, "skills")

	// Create directories
	os.MkdirAll(extensionDir, 0755)
	os.MkdirAll(skillsDir, 0755)

	// Create manifest.json
	manifest := map[string]interface{}{
		"name":        "hypernexus",
		"version":     "1.0.1",
		"description": "HyperNexus - Universal AI Control Plane with persistent memory",
		"author":      "HyperNexus LLC",
		"main":        "index.js",
		"permissions": []string{"mcp", "filesystem", "network", "process"},
		"skills": []map[string]string{
			{"name": "memory", "description": "Persistent memory across sessions"},
			{"name": "tools", "description": "38+ AI tool integrations"},
			{"name": "cloud", "description": "Cloud sync and collaboration"},
		},
	}
	manifestBytes, _ := json.MarshalIndent(manifest, "", "  ")
	os.WriteFile(filepath.Join(extensionDir, "manifest.json"), manifestBytes, 0644)

	// Create index.js
	indexJs := `// HyperNexus Claude Desktop Extension
const os = require('os');
const path = require('path');
const fs = require('fs');

const CONFIG = {
    name: 'hypernexus',
    version: '1.0.1',
    configDir: path.join(os.homedir(), '.hypernexus')
};

function initialize() {
    if (!fs.existsSync(CONFIG.configDir)) {
        fs.mkdirSync(CONFIG.configDir, { recursive: true });
    }
    console.log('[HyperNexus] Extension initialized');
}

function getInfo() {
    return { name: CONFIG.name, version: CONFIG.version, configDir: CONFIG.configDir };
}

module.exports = { initialize, getInfo, CONFIG };
initialize();
`
	os.WriteFile(filepath.Join(extensionDir, "index.js"), []byte(indexJs), 0644)

	// Create skills
	skills := map[string]string{
		"memory": `{"name":"memory","version":"1.0.0","description":"Persistent memory across sessions","commands":[{"name":"memory_save","description":"Save a memory"},{"name":"memory_search","description":"Search memories"},{"name":"memory_list","description":"List memories"}]}`,
		"tools":  `{"name":"tools","version":"1.0.0","description":"38+ AI tool integrations","commands":[{"name":"tool_list","description":"List tools"},{"name":"tool_execute","description":"Execute a tool"}]}`,
		"cloud":  `{"name":"cloud","version":"1.0.0","description":"Cloud sync and collaboration","commands":[{"name":"cloud_sync","description":"Sync data"},{"name":"cloud_share","description":"Share context"}]}`,
	}
	for name, content := range skills {
		os.WriteFile(filepath.Join(skillsDir, name+".json"), []byte(content), 0644)
	}

	return nil
}

func getWorkspaceRoot() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, "workspace", "HyperNexus")
}
