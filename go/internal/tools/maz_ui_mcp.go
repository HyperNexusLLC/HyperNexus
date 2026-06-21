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

// HandleCommitLint validates commit messages against the project's commitlint rules
func HandleCommitLint(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	commitMsg, _ :=getString(args, "commit_message")
	if commitMsg == "" {
		return err("commit_message is required")
}

	// Prepare the command to run commitlint
	cmd := exec.CommandContext(ctx, "npx", "@commitlint/cli", "--config", ".commitlintrc.ts", "--", commitMsg)
	output, e := cmd.CombinedOutput()
	if e != nil {
		return err(fmt.Sprintf("commitlint failed: %s", string(output)))
}

	return ok("Commit message is valid")
}

// HandleCodeOfConduct returns the project's code of conduct
func HandleCodeOfConduct(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	client := http.DefaultClient
	resp, e := client.Get("https://raw.githubusercontent.com/LouisMazel/maz-ui/main/.github/CODE_OF_CONDUCT.md")
	if e != nil {
		return err(fmt.Sprintf("failed to fetch code of conduct: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("unexpected status code: %d", resp.StatusCode))
}

	content := TextContent{}
	if e := json.NewDecoder(resp.Body).Decode(&content); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	return ok(content.Content)
}

// HandleIssueTemplate returns the specified issue template
func HandleIssueTemplate(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	templateName, _ :=getString(args, "template_name")
	if templateName == "" {
		return err("template_name is required")
}

	// Validate template name
	validTemplates := []string{
		"accessibility",
		"bug_report",
		"feature_request",
		"performance",
		"question",
	}
	found := false
	for _, t := range validTemplates {
		if strings.Contains(templateName, t) {
			found = true
			break
		}
	}
	if !found {
		return err("invalid template_name")
}

	// Construct URL and fetch template
	baseURL := "https://raw.githubusercontent.com/LouisMazel/maz-ui/main/.github/ISSUE_TEMPLATE/"
	fullURL := fmt.Sprintf("%s%s.md", baseURL, templateName)

	client := http.DefaultClient
	resp, e := client.Get(fullURL)
	if e != nil {
		return err(fmt.Sprintf("failed to fetch template: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("unexpected status code: %d", resp.StatusCode))
}

	content := TextContent{}
	if e := json.NewDecoder(resp.Body).Decode(&content); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	return ok(content.Content)
}

// HandlePullRequestTemplate returns the project's pull request template
func HandlePullRequestTemplate(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	client := http.DefaultClient
	resp, e := client.Get("https://raw.githubusercontent.com/LouisMazel/maz-ui/main/.github/PULL_REQUEST_TEMPLATE.md")
	if e != nil {
		return err(fmt.Sprintf("failed to fetch pull request template: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("unexpected status code: %d", resp.StatusCode))
}

	content := TextContent{}
	if e := json.NewDecoder(resp.Body).Decode(&content); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	return ok(content.Content)
}

// HandleMCPConfig returns the MCP configuration
func HandleMCPConfig(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	client := http.DefaultClient
	resp, e := client.Get("https://raw.githubusercontent.com/LouisMazel/maz-ui/main/.mcp.json")
	if e != nil {
		return err(fmt.Sprintf("failed to fetch MCP config: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("unexpected status code: %d", resp.StatusCode))
}

	var config map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&config); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	return ok(fmt.Sprintf("%v", config))
}

// HandleVSCodeSettings returns the VS Code settings
func HandleVSCodeSettings(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	client := http.DefaultClient
	resp, e := client.Get("https://raw.githubusercontent.com/LouisMazel/maz-ui/main/.vscode/settings.json")
	if e != nil {
		return err(fmt.Sprintf("failed to fetch VS Code settings: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("unexpected status code: %d", resp.StatusCode))
}

	var settings map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&settings); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	return ok(fmt.Sprintf("%v", settings))
}