package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const (
	changesetConfigPath = ".changeset/config.json"
	devContainerPath    = ".devcontainer/devcontainer.json"
)

func HandleChangesetConfig(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	configPath, _ :=getString(args, "path")
	if configPath == "" {
		configPath = changesetConfigPath
	}

	content, e := os.ReadFile(configPath)
	if e != nil {
		return err(fmt.Sprintf("Failed to read changeset config: %v", e))
}

	var config struct {
		Schema       string   `json:"$schema"`
		Changelog    string   `json:"changelog"`
		Commit       bool     `json:"commit"`
		Linked       []string `json:"linked"`
		Fixed        [][]string `json:"fixed"`
		Access       string   `json:"access"`
		BaseBranch   string   `json:"baseBranch"`
		UpdateInternalDependencies string `json:"updateInternalDependencies"`
		Ignore       []string `json:"ignore"`
	}

	if e := json.Unmarshal(content, &config); e != nil {
		return err(fmt.Sprintf("Failed to parse changeset config: %v", e))
}

	description := fmt.Sprintf("Changeset Config:\n- Schema: %s\n- Changelog: %s\n- Commit: %v\n- Access: %s\n- Base Branch: %s",
		config.Schema, config.Changelog, config.Commit, config.Access, config.BaseBranch)

	return ok(description)
}

func HandleDevContainer(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	containerPath, _ :=getString(args, "path")
	if containerPath == "" {
		containerPath = devContainerPath
	}

	content, e := os.ReadFile(containerPath)
	if e != nil {
		return err(fmt.Sprintf("Failed to read devcontainer config: %v", e))
}

	var container struct {
		Name        string `json:"name"`
		Image       string `json:"image"`
		Features    map[string]interface{} `json:"features"`
		PostCreateCommand string `json:"postCreateCommand"`
		Customizations struct {
			Vscode struct {
				Settings map[string]string `json:"settings"`
				Extensions []string `json:"extensions"`
			} `json:"vscode"`
		} `json:"customizations"`
	}

	if e := json.Unmarshal(content, &container); e != nil {
		return err(fmt.Sprintf("Failed to parse devcontainer config: %v", e))
}

	description := fmt.Sprintf("DevContainer Config:\n- Name: %s\n- Image: %s\n- Features: %v\n- Post Create Command: %s",
		container.Name, container.Image, container.Features, container.PostCreateCommand)

	return ok(description)
}

func HandleGitHubIssue(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	issueType, _ :=getString(args, "type")
	if issueType == "" {
		return err("Issue type is required")
}

	var templatePath string
	switch issueType {
	case "bug":
		templatePath = ".github/ISSUE_TEMPLATE/bug_report.md"
	case "documentation":
		templatePath = ".github/ISSUE_TEMPLATE/documentation.md"
	case "feature":
		templatePath = ".github/ISSUE_TEMPLATE/feature_request.md"
	case "technical":
		templatePath = ".github/ISSUE_TEMPLATE/technical-backlog-item.md"
	default:
		return err(fmt.Sprintf("Unknown issue type: %s", issueType))
}

	content, e := os.ReadFile(templatePath)
	if e != nil {
		return err(fmt.Sprintf("Failed to read issue template: %v", e))
}

	return ok(string(content))
}

func HandlePullRequest(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	prPath, _ :=getString(args, "path")
	if prPath == "" {
		prPath = ".github/PULL_REQUEST_TEMPLATE/pull_request_template.md"
	}

	content, e := os.ReadFile(prPath)
	if e != nil {
		return err(fmt.Sprintf("Failed to read pull request template: %v", e))
}

	return ok(string(content))
}

func HandleHyperspaceConfig(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	configPath, _ :=getString(args, "path")
	if configPath == "" {
		configPath = ".hyperspace/pull_request_bot.json"
	}

	content, e := os.ReadFile(configPath)
	if e != nil {
		return err(fmt.Sprintf("Failed to read hyperspace config: %v", e))
}

	var config struct {
		Schema string `json:"$schema"`
		Features struct {
			ControlPanel bool `json:"control_panel"`
			Summarize struct {
				AutoGenerateSummary bool `json:"auto_generate_summary"`
				AutoInsertSummary bool `json:"auto_insert_summary"`
				AutoRunOnDraftPR bool `json:"auto_run_on_draft_pr"`
			} `json:"summarize"`
			Review struct {
				AutoGenerateReview bool `json:"auto_generate_review"`
				AutoRunOnDraftPR bool `json:"auto_run_on_draft_pr"`
			} `json:"review"`
			SonarFix struct {
				Enable bool `json:"enable"`
			} `json:"sonar_fix"`
			PipelineFix struct {
				Enable bool `json:"enable"`
			} `json:"pipeline_fix"`
		} `json:"features"`
		ExcludedPaths []string `json:"excluded_paths"`
	}

	if e := json.Unmarshal(content, &config); e != nil {
		return err(fmt.Sprintf("Failed to parse hyperspace config: %v", e))
}

	description := fmt.Sprintf("Hyperspace Config:\n- Schema: %s\n- Features:\n  - Control Panel: %v\n  - Summarize:\n    - Auto Generate: %v\n    - Auto Insert: %v\n    - Auto Run on Draft: %v\n  - Review:\n    - Auto Generate: %v\n    - Auto Run on Draft: %v\n  - Sonar Fix: %v\n  - Pipeline Fix: %v",
		config.Schema,
		config.Features.ControlPanel,
		config.Features.Summarize.AutoGenerateSummary,
		config.Features.Summarize.AutoInsertSummary,
		config.Features.Summarize.AutoRunOnDraftPR,
		config.Features.Review.AutoGenerateReview,
		config.Features.Review.AutoRunOnDraftPR,
		config.Features.SonarFix.Enable,
		config.Features.PipelineFix.Enable)

	return ok(description)
}

func HandleVSCodeConfig(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	launchPath, _ :=getString(args, "launch_path")
	if launchPath == "" {
		launchPath = ".vscode/launch.json"
	}

	launchContent, e := os.ReadFile(launchPath)
	if e != nil {
		return err(fmt.Sprintf("Failed to read launch config: %v", e))
}

	settingsPath, _ :=getString(args, "settings_path")
	if settingsPath == "" {
		settingsPath = ".vscode/settings.json"
	}

	settingsContent, e := os.ReadFile(settingsPath)
	if e != nil {
		return err(fmt.Sprintf("Failed to read settings config: %v", e))
}

	var launchConfig struct {
		Version string `json:"version"`
		Inputs  []struct {
			ID          string `json:"id"`
			Description string `json:"description"`
			Type        string `json:"type"`
			Options     []string `json:"options"`
			Default     string `json:"default"`
		} `json:"inputs"`
		Configurations []struct {
			Request string `json:"request"`
			Type    string `json:"type"`
			Name    string `json:"name"`
			RuntimeExecutable string `json:"runtimeExecutable"`
			Args    []string `json:"args"`
			Console string `json:"console"`
			InternalConsoleOptions string `json:"internalConsoleOptions"`
			Cwd     string `json:"cwd"`
			Env     map[string]string `json:"env"`
		} `json:"configurations"`
	}

	if e := json.Unmarshal(launchContent, &launchConfig); e != nil {
		return err(fmt.Sprintf("Failed to parse launch config: %v", e))
}

	description := fmt.Sprintf("VSCode Config:\n- Launch Configurations: %d\n- Inputs: %d",
		len(launchConfig.Configurations), len(launchConfig.Inputs))

	return ok(description)
}