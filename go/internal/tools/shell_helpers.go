package tools

import (
	"context"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

// HandleBash executes a shell command.
func HandleBash(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	command, _ := getString(args, "command")
	if command == "" {
		return err("command is required")
	}
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.CommandContext(ctx, "cmd", "/C", command)
	} else {
		cmd = exec.CommandContext(ctx, "sh", "-c", command)
	}
	out, cmdErr := cmd.CombinedOutput()
	output := string(out)
	if cmdErr != nil && output == "" {
		return err(fmt.Sprintf("command failed: %v", cmdErr))
	}
	return ok(output)
}

// runPowerShellScript executes a PowerShell script and returns stdout.
func runPowerShellScript(ctx context.Context, script string) (string, error) {
	cmd := exec.CommandContext(ctx, "powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script)
	out, err := cmd.CombinedOutput()
	if err != nil && len(out) == 0 {
		return "", fmt.Errorf("powershell failed: %v", err)
	}
	return strings.TrimSpace(string(out)), nil
}
