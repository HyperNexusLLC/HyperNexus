package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// This file registers the kernel-bridging MCP tools that were previously only
// reachable through the stdio MCP server's local switch, so every advertised
// tool also works through the HTTP tool router (/api/agent/tool) used by the
// harness adapters' mcp_call surfaces. Handlers are thin self-proxies onto the
// kernel's own HTTP API — identical output to the stdio server implementations
// in cmd/tormentnexus/mcp_server.go.

// KernelBaseURL returns the kernel's own HTTP base URL for self-referential
// tool proxies. HYPERNEXUS_URL wins; otherwise the default local endpoint.
func KernelBaseURL() string {
	if v := strings.TrimSpace(os.Getenv("HYPERNEXUS_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "http://127.0.0.1:7778"
}

func kernelGet(path string) (ToolResponse, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	resp, getErr := client.Get(KernelBaseURL() + path)
	if getErr != nil {
		return err(fmt.Sprintf("kernel bridge error: %v", getErr))
	}
	defer resp.Body.Close()
	data, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return err(fmt.Sprintf("kernel bridge read error: %v", readErr))
	}
	return ok(string(data))
}

func kernelPost(path string, payload map[string]any, timeout time.Duration) (ToolResponse, error) {
	body, marshalErr := json.Marshal(payload)
	if marshalErr != nil {
		return err(fmt.Sprintf("encode error: %v", marshalErr))
	}
	client := &http.Client{Timeout: timeout}
	resp, postErr := client.Post(KernelBaseURL()+path, "application/json", strings.NewReader(string(body)))
	if postErr != nil {
		return err(fmt.Sprintf("kernel bridge error: %v", postErr))
	}
	defer resp.Body.Close()
	data, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return err(fmt.Sprintf("kernel bridge read error: %v", readErr))
	}
	return ok(string(data))
}

// HandleMCPStatus — mcp_status: kernel MCP bridge status.
func HandleMCPStatus(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	return kernelGet("/api/mcp/status")
}

// HandleMCPServersList — mcp_list_servers: configured + runtime MCP servers.
func HandleMCPServersList(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	return kernelGet("/api/mcp/servers")
}

// HandleMCPListTools — mcp_list_tools: MCP tool inventory.
func HandleMCPListTools(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	return kernelGet("/api/mcp/tools")
}

// HandleMCPCallTool — mcp_call_tool: {serverName, toolName, arguments}.
func HandleMCPCallTool(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	serverName := strArg(args, "serverName", "server")
	toolName := strArg(args, "toolName", "tool", "name")
	if toolName == "" {
		return err("toolName is required")
	}
	payload := map[string]any{
		"serverName": serverName,
		"toolName":   toolName,
	}
	switch a := args["arguments"].(type) {
	case string:
		var parsed map[string]any
		if jsonErr := json.Unmarshal([]byte(a), &parsed); jsonErr == nil {
			payload["arguments"] = parsed
		}
	case map[string]any:
		payload["arguments"] = a
	}
	return kernelPost("/api/mcp/tools/call", payload, 30*time.Second)
}

// HandleMCPServerTest — mcp_server_test: {serverName, operation}.
func HandleMCPServerTest(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	serverName := strArg(args, "serverName", "server", "name")
	operation := strArg(args, "operation")
	if operation == "" {
		operation = "tools/list"
	}
	payload := map[string]any{
		"targetKind": "server",
		"serverName": serverName,
		"operation":  operation,
	}
	return kernelPost("/api/mcp/server-test", payload, 15*time.Second)
}

// HandleInspectWindowUI — inspect_window_ui: read-only UIAutomation inspection
// of the active window (same behavior as the stdio MCP server implementation).
func HandleInspectWindowUI(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	windowTitle := strArg(args, "windowTitle", "title")
	filter := ""
	if windowTitle != "" {
		filter = fmt.Sprintf(` | Where-Object { $_.MainWindowTitle -like '*%s*' }`, strings.ReplaceAll(windowTitle, "'", "''"))
	}
	script := fmt.Sprintf(`Add-Type -AssemblyName UIAutomationClient; $p = Get-Process%s | Select-Object -First 1; if (!$p) { 'No matching window found'; return }; $r = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition); $el = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition); 'Window found: ' + $p.MainWindowTitle`, filter)
	out, cmdErr := runPowerShellScript(ctx, script)
	if cmdErr != nil {
		return err(fmt.Sprintf("inspect failed: %v", cmdErr))
	}
	return ok(out)
}
