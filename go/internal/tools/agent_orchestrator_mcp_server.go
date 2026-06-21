package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os/exec"
	"strings"
	"time"
)

var http.DefaultClient = http.DefaultClient

func HandleAgentStatus(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	agentID, _ :=getString(args, "agent_id")
	if agentID == "" {
		return err("agent_id is required")
}

	// Simulate checking agent status
	status := "active"
	if strings.Contains(agentID, "inactive") {
		status = "inactive"
	}

	return ok(fmt.Sprintf("Agent %s status: %s", agentID, status))
}

func HandleAgentDeploy(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	agentID, _ :=getString(args, "agent_id")
	packageURL, _ :=getString(args, "package_url")
	if agentID == "" || packageURL == "" {
		return err("agent_id and package_url are required")
}

	// Validate URL
	_, e := url.ParseRequestURI(packageURL)
	if e != nil {
		return err("invalid package URL")
}

	// Simulate deployment
	return ok(fmt.Sprintf("Deploying package %s to agent %s", packageURL, agentID))
}

func HandleAgentRestart(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	agentID, _ :=getString(args, "agent_id")
	if agentID == "" {
		return err("agent_id is required")
}

	// Simulate restart command
	cmd := exec.Command("echo", "Restarting agent", agentID)
	output, e := cmd.CombinedOutput()
	if e != nil {
		return err(fmt.Sprintf("failed to restart agent: %v", e))
}

	return ok(string(output))
}

func HandleAgentList(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	// Simulate listing agents
	agents := []string{"agent-001", "agent-002", "agent-003"}
	return ok(fmt.Sprintf("Active agents: %v", strings.Join(agents, ", ")))
}

func HandleAgentHealthCheck(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	agentID, _ :=getString(args, "agent_id")
	if agentID == "" {
		return err("agent_id is required")
}

	// Simulate health check
	resp, e := http.DefaultClient.Get(fmt.Sprintf("http://%s/health", agentID))
	if e != nil {
		return err(fmt.Sprintf("health check failed: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("agent %s is unhealthy (status: %d)", agentID, resp.StatusCode))
}

	var healthData map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&healthData); e != nil {
		return err(fmt.Sprintf("failed to decode health data: %v", e))
}

	return ok(fmt.Sprintf("Agent %s is healthy: %v", agentID, healthData))
}

func HandleAgentConfigUpdate(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	agentID, _ :=getString(args, "agent_id")
	config, _ :=getString(args, "config")
	if agentID == "" || config == "" {
		return err("agent_id and config are required")
}

	// Simulate config update
	return ok(fmt.Sprintf("Updated config for agent %s: %s", agentID, config))
}