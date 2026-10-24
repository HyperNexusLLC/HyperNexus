package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	roottools "gitlab.com/HyperNexusLLC/HyperNexus/tools"
)

// This file completes stdio↔router tool parity: every tool the stdio MCP server
// advertises now also works through the HTTP tool router (/api/agent/tool).
// UI-automation tools mirror the PowerShell implementations in
// cmd/tormentnexus/mcp_server.go exactly; kernel-data tools self-proxy onto the
// kernel's own HTTP API.

// SupervisorSettings mirrors cmd/tormentnexus.SupervisorSettings (file-backed at
// ~/.hypernexus/supervisor-settings.json with the same defaults).
type SupervisorSettings struct {
	BumpText           string   `json:"bumpText"`
	BumpSentences      []string `json:"bumpSentences"`
	ActionLabels       []string `json:"actionLabels"`
	FocusDelayMs       int      `json:"focusDelayMs"`
	AfterClickDelayMs  int      `json:"afterClickDelayMs"`
	InputSettleDelayMs int      `json:"inputSettleDelayMs"`
}

func supervisorSettingsPath() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".hypernexus", "supervisor-settings.json")
}

func defaultSupervisorSettings() SupervisorSettings {
	return SupervisorSettings{
		BumpText: "keep going",
		BumpSentences: []string{
			"keep going", "proceed", "outstanding", "perfect", "onward",
			"continue", "great work, keep it up", "excellent, please proceed",
			"magnificent, continue", "onward ho!",
		},
		ActionLabels: []string{
			"Run", "Expand", "Always Allow", "Retry", "Accept all", "Accept",
			"Allow", "Approve", "Proceed", "Keep", "Accept all changes",
			"Accept All Changes", "Accept All", "Approve All", "Run command", "Allow all",
		},
		FocusDelayMs:       100,
		AfterClickDelayMs:  150,
		InputSettleDelayMs: 120,
	}
}

func loadSupervisorSettings() SupervisorSettings {
	s := defaultSupervisorSettings()
	data, readErr := os.ReadFile(supervisorSettingsPath())
	if readErr != nil {
		return s
	}
	_ = json.Unmarshal(data, &s)
	return s
}

func saveSupervisorSettings(s SupervisorSettings) error {
	path := supervisorSettingsPath()
	_ = os.MkdirAll(filepath.Dir(path), 0755)
	data, marshalErr := json.MarshalIndent(s, "", "  ")
	if marshalErr != nil {
		return marshalErr
	}
	return os.WriteFile(path, data, 0644)
}

// escapeSendKeys mirrors cmd/tormentnexus.escapeSendKeys.
func escapeSendKeys(s string) string {
	s = strings.ReplaceAll(s, "+", "{+}")
	s = strings.ReplaceAll(s, "^", "{^}")
	s = strings.ReplaceAll(s, "%", "{%}")
	s = strings.ReplaceAll(s, "~", "{~}")
	s = strings.ReplaceAll(s, "(", "{(}")
	s = strings.ReplaceAll(s, ")", "{)}")
	return s
}

// psQuote escapes a string for single-quoted PowerShell interpolation.
func psQuote(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

// HandleBillingStatus — billing_status: kernel provider billing/quotas.
func HandleBillingStatus(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	return kernelGet("/api/billing/status")
}

// HandleSystemStatus — system_status: kernel health summary.
func HandleSystemStatus(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	return kernelGet("/health")
}

// HandleListAccessoryTools — list_accessory_tools: built-in Go accessory tool names.
func HandleListAccessoryTools(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	reg := roottools.NewRegistry()
	names := make([]string, 0, len(reg.Tools))
	for _, t := range reg.Tools {
		names = append(names, t.Name)
	}
	data, _ := json.MarshalIndent(names, "", "  ")
	return ok(string(data))
}

// HandleGetSupervisorSettingsFile — get_supervisor_settings (file-backed).
func HandleGetSupervisorSettingsFile(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	s := loadSupervisorSettings()
	data, _ := json.MarshalIndent(s, "", "  ")
	return ok(string(data))
}

// HandleUpdateSupervisorSettings — update_supervisor_settings: merge + persist.
func HandleUpdateSupervisorSettings(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	s := loadSupervisorSettings()
	if v, found := getString(args, "bumpText"); found {
		s.BumpText = v
	}
	if n, found := getInt(args, "focusDelayMs"); found {
		s.FocusDelayMs = n
	}
	if n, found := getInt(args, "afterClickDelayMs"); found {
		s.AfterClickDelayMs = n
	}
	if n, found := getInt(args, "inputSettleDelayMs"); found {
		s.InputSettleDelayMs = n
	}
	if labels := strArg(args, "actionLabels"); labels != "" {
		parts := []string{}
		for _, p := range strings.Split(labels, ",") {
			if t := strings.TrimSpace(p); t != "" {
				parts = append(parts, t)
			}
		}
		if len(parts) > 0 {
			s.ActionLabels = parts
		}
	}
	if saveErr := saveSupervisorSettings(s); saveErr != nil {
		return err(fmt.Sprintf("save failed: %v", saveErr))
	}
	data, _ := json.MarshalIndent(s, "", "  ")
	return ok(string(data))
}

// HandleClickChatButton — click_chat_button: UIAutomation Invoke on a named button.
func HandleClickChatButton(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	label := strArg(args, "label", "text")
	if label == "" {
		return err("label is required")
	}
	windowTitle := strArg(args, "windowTitle")
	script := fmt.Sprintf(`
Add-Type -AssemblyName UIAutomationClient
$root = [System.Windows.Automation.AutomationElement]::RootElement
$win = $root
if ('%s') {
  $p = Get-Process | Where-Object { $_.MainWindowTitle -like '*%s*' } | Select-Object -First 1
  if ($p) { $winCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $p.Id); $win = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, $winCond) }
}
$cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, '%s')
$el = $win.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
if (!$el) { 'Button not found: %s'; return }
$inv = $el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
$inv.Invoke()
'Clicked: %s'
`, psQuote(windowTitle), psQuote(windowTitle), psQuote(label), psQuote(label), psQuote(label))
	out, cmdErr := runPowerShellScript(ctx, script)
	if cmdErr != nil {
		return err(fmt.Sprintf("click failed: %v", cmdErr))
	}
	return ok(out)
}

// HandleClickActionButtons — click_action_buttons: focus the target window and
// report the labels (same behavior as the stdio implementation).
func HandleClickActionButtons(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	labels := strArg(args, "labels")
	windowTitle := strArg(args, "windowTitle")
	var script string
	if labels != "" && windowTitle != "" {
		script = fmt.Sprintf(`$shell = New-Object -ComObject WScript.Shell; $shell.AppActivate((Get-Process | Where-Object { $_.MainWindowTitle -like '*%s*' } | Select-Object -First 1).Id) | Out-Null; Start-Sleep -Milliseconds 200; 'Focused window: %s'; 'Labels: %s'`, psQuote(windowTitle), psQuote(windowTitle), psQuote(labels))
	} else {
		script = `'No specific labels or window targeted'`
	}
	out, cmdErr := runPowerShellScript(ctx, script)
	if cmdErr != nil {
		return err(fmt.Sprintf("click failed: %v", cmdErr))
	}
	return ok(out)
}

// HandleSetChatInput — set_chat_input: type text into the focused chat input.
func HandleSetChatInput(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	text := strArg(args, "text", "content")
	windowTitle := strArg(args, "windowTitle")
	if windowTitle == "" {
		return err("windowTitle is required — refusing to type into an arbitrary focused window")
	}
	script := fmt.Sprintf(`
Add-Type -AssemblyName System.Windows.Forms
$shell = New-Object -ComObject WScript.Shell
$target = Get-Process | Where-Object { $_.MainWindowTitle -like '*%s*' } | Select-Object -First 1
if (-not $target) { 'ERROR: no window matching ''%s'' — not typing'; exit }
$shell.AppActivate($target.Id) | Out-Null
Start-Sleep -Milliseconds 300
$shell.SendKeys('%s')
"Set text (%d chars) in chat input"
`, psQuote(windowTitle), psQuote(windowTitle), escapeSendKeys(psQuote(text)), len(text))
	out, cmdErr := runPowerShellScript(ctx, script)
	if cmdErr != nil {
		return err(fmt.Sprintf("set input failed: %v", cmdErr))
	}
	return ok(out)
}

// HandleSubmitChatInput — submit_chat_input: press Enter in the chat input.
func HandleSubmitChatInput(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	windowTitle := strArg(args, "windowTitle")
	if windowTitle == "" {
		return err("windowTitle is required — refusing to submit into an arbitrary focused window")
	}
	script := fmt.Sprintf(`
Add-Type -AssemblyName System.Windows.Forms
$shell = New-Object -ComObject WScript.Shell
$target = Get-Process | Where-Object { $_.MainWindowTitle -like '*%s*' } | Select-Object -First 1
if (-not $target) { 'ERROR: no window matching ''%s'' — not submitting'; exit }
$shell.AppActivate($target.Id) | Out-Null
Start-Sleep -Milliseconds 300
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
"Submitted chat"
`, psQuote(windowTitle), psQuote(windowTitle))
	out, cmdErr := runPowerShellScript(ctx, script)
	if cmdErr != nil {
		return err(fmt.Sprintf("submit failed: %v", cmdErr))
	}
	return ok(out)
}

// HandleSimulateInput — simulate_input: send arbitrary keys via SendKeys.
func HandleSimulateInput(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	keys := strArg(args, "keys", "text", "keys_string")
	windowTitle := strArg(args, "windowTitle")
	if windowTitle == "" {
		return err("windowTitle is required — refusing to send keys to an arbitrary focused window")
	}
	script := fmt.Sprintf(`
Add-Type -AssemblyName System.Windows.Forms
if ('%s') {
	$h = Get-Process | Where-Object { $_.MainWindowTitle -like '*%s*' } | Select-Object -First 1
	if ($h) { $h.WaitForInputIdle(1000) | Out-Null; Start-Sleep -Milliseconds 200 }
}
[System.Windows.Forms.SendKeys]::SendWait('%s')
"Sent: %s"
`, psQuote(windowTitle), psQuote(windowTitle), escapeSendKeys(psQuote(keys)), psQuote(keys))
	out, cmdErr := runPowerShellScript(ctx, script)
	if cmdErr != nil {
		return err(fmt.Sprintf("simulate failed: %v", cmdErr))
	}
	return ok(out)
}

// HandleAdvanceChat — advance_chat: single-step autopilot announcement.
func HandleAdvanceChat(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	bumpText := strArg(args, "bumpText")
	windowTitle := strArg(args, "windowTitle")
	parts := []string{}
	if windowTitle != "" {
		parts = append(parts, fmt.Sprintf("window: %s", windowTitle))
	}
	if bumpText != "" {
		parts = append(parts, fmt.Sprintf("bump: %s", bumpText))
	}
	return ok(fmt.Sprintf("Advance chat: %s", strings.Join(parts, ", ")))
}
