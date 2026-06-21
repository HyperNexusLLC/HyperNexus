package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os/exec"
	"strings"
)

func HandlePenpotMCP(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	port, _ :=getString(args, "port")
	if port == "" {
		return err("port is required")
}

	penpotURL := fmt.Sprintf("http://localhost:%s/mcp", port)
	resp, e := http.Get(penpotURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("Penpot MCP not available: %s", resp.Status))
}

	return ok(fmt.Sprintf("Connected to Penpot MCP at %s", penpotURL))
}

func HandleSerenaMCP(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	port, _ :=getString(args, "port")
	if port == "" {
		return err("port is required")
}

	serenaURL := fmt.Sprintf("http://localhost:%s/mcp", port)
	resp, e := http.Get(serenaURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("Serena MCP not available: %s", resp.Status))
}

	return ok(fmt.Sprintf("Connected to Serena MCP at %s", serenaURL))
}

func HandlePlaywright(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	cmd := exec.Command("npx", "@playwright/mcp@latest", "--cdp-endpoint=http://127.0.0.1:9222")
	output, e := cmd.CombinedOutput()
	if e != nil {
		return err(fmt.Sprintf("Playwright failed: %s", string(output)))
}

	return ok("Playwright MCP server started successfully")
}

func HandleMCPConfig(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	client, _ :=getString(args, "client")
	if client == "" {
		return err("client is required (claude-code|opencode|vscode|codex)")
}

	port, _ :=getString(args, "port")
	if port == "" {
		return err("port is required")
}

	var config string
	switch client {
	case "claude-code":
		config = fmt.Sprintf(`{
  "mcpServers": {
    "penpot": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:%s/mcp", "--allow-http"]
    },
    "serena-devenv": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:%s/mcp", "--allow-http"]
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--cdp-endpoint=http://127.0.0.1:9222"]
    }
  }
}`, port, port)
	case "opencode":
		config = fmt.Sprintf(`{
  "mcp": {
    "penpot": {
      "type": "remote",
      "url": "http://localhost:%s/mcp",
      "enabled": true
    },
    "serena-devenv": {
      "type": "remote",
      "url": "http://localhost:%s/mcp",
      "enabled": true
    },
    "playwright": {
      "type": "local",
      "command": ["npx", "@playwright/mcp@latest", "--cdp-endpoint=http://127.0.0.1:9222"],
      "enabled": true
    }
  }
}`, port, port)
	case "vscode":
		config = fmt.Sprintf(`{
  "servers": {
    "penpot": {
      "type": "http",
      "url": "http://localhost:%s/mcp"
    },
    "serena-devenv": {
      "type": "http",
      "url": "http://localhost:%s/mcp"
    },
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--cdp-endpoint=http://127.0.0.1:9222"]
    }
  }
}`, port, port)
	case "codex":
		config = fmt.Sprintf(`mcp_servers.penpot.url="http://localhost:%s/mcp"
mcp_servers.serena-devenv.url="http://localhost:%s/mcp"
mcp_servers.playwright.command=["npx", "@playwright/mcp@latest", "--cdp-endpoint=http://127.0.0.1:9222"]`, port, port)
	default:
		return err(fmt.Sprintf("unsupported client: %s", client))
}

	return ok(config)
}

func HandleMCPCheck(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	client, _ :=getString(args, "client")
	if client == "" {
		return err("client is required (claude-code|opencode|vscode|codex)")
}

	var url string
	switch client {
	case "claude-code", "opencode", "vscode":
		url = "http://localhost:9222"
	case "codex":
		url = "http://localhost:9222"
	default:
		return err(fmt.Sprintf("unsupported client: %s", client))
}

	resp, e := http.Get(url)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("MCP server not available: %s", resp.Status))
}

	return ok(fmt.Sprintf("%s MCP server is available at %s", client, url))
}