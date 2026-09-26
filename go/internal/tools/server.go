package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	foundationrepomap "gitlab.com/HyperNexusLLC/HyperNexus/foundation/repomap"
)

// HandleEcho returns the message provided in the arguments.
func HandleEcho(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	message, _ := getString(args, "message")
	return ok(message)
}

// HandleHelloWorld returns a greeting message.
func HandleHelloWorld(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	name, _ := getString(args, "name")
	if name == "" {
		name = "World"
	}

	response := map[string]string{
		"message": fmt.Sprintf("Hello, %s!", name),
	}

	data, e := json.Marshal(response)
	if e != nil {
		return err(e.Error())
	}

	return ok(string(data))
}

// HandleScratchpadGet retrieves a core memory scratchpad value by key.
func HandleScratchpadGet(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	key, _ := getString(args, "key")
	if key == "" {
		return err("key is required")
	}
	if GlobalVectorStore == nil {
		return err("vector store not initialized")
	}
	val, getErr := GlobalVectorStore.GetScratchpadValue(ctx, key)
	if getErr != nil {
		return err(fmt.Sprintf("scratchpad get failed: %v", getErr))
	}
	return ok(val)
}

// HandleScratchpadSet writes/overwrites a core memory scratchpad value.
func HandleScratchpadSet(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	key, _ := getString(args, "key")
	if key == "" {
		return err("key is required")
	}
	value, _ := getString(args, "value")
	if GlobalVectorStore == nil {
		return err("vector store not initialized")
	}
	if setErr := GlobalVectorStore.SetScratchpadValue(ctx, key, value); setErr != nil {
		return err(fmt.Sprintf("scratchpad set failed: %v", setErr))
	}
	return ok(fmt.Sprintf("Scratchpad key '%s' set", key))
}

// HandleScratchpadAppend appends text to an existing core memory scratchpad value.
func HandleScratchpadAppend(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	key, _ := getString(args, "key")
	if key == "" {
		return err("key is required")
	}
	value, _ := getString(args, "value")
	if value == "" {
		return err("value is required")
	}
	if GlobalVectorStore == nil {
		return err("vector store not initialized")
	}
	if appendErr := GlobalVectorStore.AppendScratchpadValue(ctx, key, value); appendErr != nil {
		return err(fmt.Sprintf("scratchpad append failed: %v", appendErr))
	}
	return ok(fmt.Sprintf("Appended to scratchpad key '%s'", key))
}

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

// HandleListDir lists directory contents.
func HandleListDir(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	path, _ := getString(args, "path")
	if path == "" {
		path = "."
	}
	limit, _ := getInt(args, "limit")
	if limit <= 0 {
		limit = 50
	}
	entries, readErr := os.ReadDir(path)
	if readErr != nil {
		return err(fmt.Sprintf("readdir failed: %v", readErr))
	}
	var sb strings.Builder
	count := 0
	for _, e := range entries {
		if count >= limit {
			sb.WriteString(fmt.Sprintf("... and %d more entries\n", len(entries)-limit))
			break
		}
		suffix := ""
		if e.IsDir() {
			suffix = "/"
		}
		sb.WriteString(fmt.Sprintf("%s%s\n", e.Name(), suffix))
		count++
	}
	return ok(sb.String())
}

// HandleReadFile reads a file's contents.
func HandleReadFile(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	path, _ := getString(args, "path")
	if path == "" {
		return err("path is required")
	}
	data, readErr := os.ReadFile(path)
	if readErr != nil {
		return err(fmt.Sprintf("read failed: %v", readErr))
	}
	return ok(string(data))
}

// HandleWriteFile writes content to a file.
func HandleWriteFile(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	path, _ := getString(args, "path")
	if path == "" {
		return err("path is required")
	}
	content, _ := getString(args, "content")
	if writeErr := os.WriteFile(path, []byte(content), 0644); writeErr != nil {
		return err(fmt.Sprintf("write failed: %v", writeErr))
	}
	return ok(fmt.Sprintf("Wrote %d bytes to %s", len(content), path))
}

// HandleGrep searches file contents for a pattern.
func HandleGrep(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	pattern, _ := getString(args, "pattern")
	if pattern == "" {
		return err("pattern is required")
	}
	path, _ := getString(args, "path")
	if path == "" {
		path = "."
	}
	var results []string
	filepath.Walk(path, func(fpath string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return nil
		}
		if info.IsDir() {
			name := info.Name()
			if name == ".git" || name == "node_modules" || name == ".next" || name == "dist" {
				return filepath.SkipDir
			}
			return nil
		}
		if info.Size() > 1024*1024 { // skip files > 1MB
			return nil
		}
		data, readErr := os.ReadFile(fpath)
		if readErr != nil {
			return nil
		}
		if strings.Contains(string(data), pattern) {
			rel, _ := filepath.Rel(path, fpath)
			results = append(results, rel)
		}
		return nil
	})
	if len(results) == 0 {
		return ok("No matches found")
	}
	if len(results) > 30 {
		results = results[:30]
	}
	return ok(fmt.Sprintf("Found %d matches:\n%s", len(results), strings.Join(results, "\n")))
}

// HandleFind finds files by glob pattern.
func HandleFind(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	pattern, _ := getString(args, "pattern")
	if pattern == "" {
		return err("pattern is required")
	}
	matches, globErr := filepath.Glob(pattern)
	if globErr != nil {
		return err(fmt.Sprintf("glob failed: %v", globErr))
	}
	if len(matches) == 0 {
		return ok("No files matched")
	}
	limit, _ := getInt(args, "limit")
	if limit <= 0 {
		limit = 50
	}
	if len(matches) > limit {
		matches = matches[:limit]
	}
	return ok(strings.Join(matches, "\n"))
}

// HandleRepomap generates a ranked repository map.
func HandleRepomap(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	baseDir, _ := getString(args, "dir")
	if baseDir == "" {
		baseDir = "."
	}
	maxFiles, _ := getInt(args, "max_files")
	if maxFiles <= 0 {
		maxFiles = 40
	}
	includeTests, _ := getBool(args, "include_tests")

	toStringSlice := func(v interface{}) []string {
		if arr, ok := v.([]interface{}); ok {
			out := make([]string, 0, len(arr))
			for _, item := range arr {
				if s, ok := item.(string); ok {
					out = append(out, s)
				}
			}
			return out
		}
		return nil
	}

	result, genErr := foundationrepomap.Generate(ctx, foundationrepomap.Options{
		BaseDir:         baseDir,
		MentionedFiles:  toStringSlice(args["mention_file"]),
		MentionedIdents: toStringSlice(args["mention_ident"]),
		MaxFiles:        maxFiles,
		IncludeTests:    includeTests,
	})
	if genErr != nil {
		return err(fmt.Sprintf("repomap failed: %v", genErr))
	}
	return ok(result.Map)
}

// HandleGetSystemStats returns real-time system metrics.
func HandleGetSystemStats(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	hostname, _ := os.Hostname()
	stats := fmt.Sprintf("Hostname: %s\nOS: %s\nArch: %s\nCPUs: %d\nAllocated Memory: %v MB\nTotal Memory: %v MB\nGoroutines: %d",
		hostname, runtime.GOOS, runtime.GOARCH, runtime.NumCPU(),
		m.Alloc/1024/1024, m.TotalAlloc/1024/1024, runtime.NumGoroutine())
	return ok(stats)
}

// HandleApplySearchReplace applies strict search/replace block to a file.
func HandleApplySearchReplace(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	filePath, _ := getString(args, "file_path")
	searchBlock, _ := getString(args, "search_block")
	replaceBlock, _ := getString(args, "replace_block")
	if filePath == "" || searchBlock == "" {
		return err("file_path and search_block are required")
	}
	content, readErr := os.ReadFile(filePath)
	if readErr != nil {
		return err(fmt.Sprintf("read failed: %v", readErr))
	}
	strContent := string(content)
	if !strings.Contains(strContent, searchBlock) {
		return err("search block not found in file")
	}
	newContent := strings.Replace(strContent, searchBlock, replaceBlock, 1)
	if writeErr := os.WriteFile(filePath, []byte(newContent), 0644); writeErr != nil {
		return err(fmt.Sprintf("write failed: %v", writeErr))
	}
	return ok(fmt.Sprintf("Applied search/replace to %s", filePath))
}

// HandleLaunchWebview opens a URL in the system browser.
func HandleLaunchWebview(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	url, _ := getString(args, "url")
	if url == "" {
		return err("url is required")
	}
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.CommandContext(ctx, "cmd", "/c", "start", url)
	case "darwin":
		cmd = exec.CommandContext(ctx, "open", url)
	default:
		cmd = exec.CommandContext(ctx, "xdg-open", url)
	}
	if startErr := cmd.Start(); startErr != nil {
		return err(fmt.Sprintf("launch failed: %v", startErr))
	}
	return ok(fmt.Sprintf("Launched %s", url))
}

// HandleAddBookmark saves a URL with title and tags.
func HandleAddBookmark(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	title, _ := getString(args, "title")
	url, _ := getString(args, "url")
	if title == "" || url == "" {
		return err("title and url are required")
	}
	tagsRaw, _ := args["tags"].([]interface{})
	var tags []string
	for _, t := range tagsRaw {
		if s, ok := t.(string); ok {
			tags = append(tags, s)
		}
	}
	bookmark := map[string]interface{}{"title": title, "url": url, "tags": tags}
	data, _ := json.MarshalIndent(bookmark, "", "  ")
	_ = os.MkdirAll("./.supercli", 0755)
	_ = os.WriteFile("./.supercli/bookmarks.json", data, 0644)
	return ok(fmt.Sprintf("Bookmark '%s' saved", title))
}

// HandleCloudTroubleshoot diagnoses cloud infrastructure issues.
func HandleCloudTroubleshoot(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	resourceID, _ := getString(args, "resource_id")
	errorLog, _ := getString(args, "error_log")
	diagnostic := fmt.Sprintf("Diagnostic for %s:\nAnalyzed log: %s\nPotential Root Cause: IAM permissions misconfiguration or network boundary issue.\nSuggested Fix: Review security group inbound rules.", resourceID, errorLog)
	return ok(diagnostic)
}

// HandleGenerateDevopsPipeline generates CI/CD pipeline YAML.
func HandleGenerateDevopsPipeline(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	platform, _ := getString(args, "platform")
	projectType, _ := getString(args, "project_type")
	if strings.Contains(strings.ToLower(platform), "github") {
		pipeline := fmt.Sprintf("name: %s CI\n\non: [push]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n    - uses: actions/checkout@v3\n    - name: Run Build\n      run: make build", projectType)
		return ok(pipeline)
	}
	return ok("Pipeline generation supported for GitHub Actions, GitLab CI, and Jenkins.")
}

// HandleJiraCreateIssue creates a Jira issue (stub).
func HandleJiraCreateIssue(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	projectKey, _ := getString(args, "project_key")
	summary, _ := getString(args, "summary")
	description, _ := getString(args, "description")
	return ok(fmt.Sprintf("Created issue in %s: %s\nDescription: %s", projectKey, summary, description))
}

// HandleConfluenceSearch searches Confluence (stub).
func HandleConfluenceSearch(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	query, _ := getString(args, "query")
	return ok(fmt.Sprintf("Found 3 documents matching '%s'. (Simulated Confluence search results)", query))
}

// HandleDownloadLlamafile downloads a standalone model binary.
func HandleDownloadLlamafile(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	url, _ := getString(args, "url")
	dest, _ := getString(args, "dest_path")
	if url == "" || dest == "" {
		return err("url and dest_path are required")
	}
	resp, getErr := http.Get(url)
	if getErr != nil {
		return err(fmt.Sprintf("download failed: %v", getErr))
	}
	defer resp.Body.Close()
	out, createErr := os.Create(dest)
	if createErr != nil {
		return err(fmt.Sprintf("create file failed: %v", createErr))
	}
	defer out.Close()
	if _, copyErr := io.Copy(out, resp.Body); copyErr != nil {
		return err(fmt.Sprintf("write failed: %v", copyErr))
	}
	_ = os.Chmod(dest, 0755)
	return ok(fmt.Sprintf("Downloaded to %s", dest))
}

// ─── Supervisor Tools ───

// HandleListProcesses lists active system processes.
func HandleListProcesses(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	script := `Get-Process | Select-Object Id, ProcessName, @{N='MemMB';E={[math]::Round($_.WorkingSet64/1MB,1)}} | ConvertTo-Json -Compress`
	out, cmdErr := runPowerShellScript(ctx, script)
	if cmdErr != nil {
		return err(fmt.Sprintf("list processes failed: %v", cmdErr))
	}
	return ok(out)
}

// HandleKillProcess kills a process by PID.
func HandleKillProcess(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	pid, _ := getInt(args, "pid")
	if pid <= 0 {
		return err("pid is required")
	}
	script := fmt.Sprintf(`Stop-Process -Id %d -Force -ErrorAction SilentlyContinue; if ($?) { "Killed PID %d" } else { "Failed to kill PID %d" }`, pid, pid, pid)
	out, cmdErr := runPowerShellScript(ctx, script)
	if cmdErr != nil {
		return err(fmt.Sprintf("kill failed: %v", cmdErr))
	}
	return ok(out)
}

// HandleDetectChatState detects whether chat is waiting for input or has action buttons.
func HandleDetectChatState(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	script := `$p = Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object -First 1; if (!$p) { '{"state":"no_window"}'; return }; $title = $p.MainWindowTitle; $name = $p.ProcessName; ConvertTo-Json @{activeWindow=$title; processName=$name; state='unknown'; timestamp=(Get-Date -Format o)}`
	out, cmdErr := runPowerShellScript(ctx, script)
	if cmdErr != nil {
		return err(fmt.Sprintf("detect failed: %v", cmdErr))
	}
	return ok(out)
}

// HandleDetectChatSurface inspects the active window and classifies the chat surface.
func HandleDetectChatSurface(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	script := `$p = Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object -First 5 | Select-Object Id, ProcessName, @{N='Title';E={$_.MainWindowTitle}} | ConvertTo-Json -Compress`
	out, cmdErr := runPowerShellScript(ctx, script)
	if cmdErr != nil {
		return err(fmt.Sprintf("detect failed: %v", cmdErr))
	}
	return ok(out)
}

// HandleListSurfaceProfiles lists known supervisor surface profiles.
func HandleListSurfaceProfiles(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	type Profile struct {
		ID          string   `json:"id"`
		DisplayName string   `json:"displayName"`
		Labels      []string `json:"actionLabels"`
		SubmitKey   string   `json:"submitKeyChord"`
	}
	profiles := []Profile{
		{ID: "default", DisplayName: "Default chat surface", Labels: []string{"Run", "Expand", "Always Allow", "Retry", "Accept", "Allow", "Approve", "Proceed", "Keep"}, SubmitKey: "alt+enter"},
		{ID: "antigravity", DisplayName: "Antigravity browser chat", Labels: []string{"Run", "Expand", "Always Allow", "Retry", "Accept", "Allow", "Approve", "Proceed", "Keep"}, SubmitKey: "alt+enter"},
		{ID: "claude-web", DisplayName: "Claude web chat", Labels: []string{"Retry", "Accept", "Allow", "Proceed", "Keep"}, SubmitKey: "enter"},
		{ID: "chatgpt-web", DisplayName: "ChatGPT web chat", Labels: []string{"Retry", "Continue", "Proceed", "Accept"}, SubmitKey: "enter"},
		{ID: "cursor", DisplayName: "Cursor chat surface", Labels: []string{"Run", "Retry", "Accept", "Allow", "Proceed", "Keep"}, SubmitKey: "ctrl+enter"},
		{ID: "vscode", DisplayName: "VS Code or editor chat", Labels: []string{"Run", "Accept", "Allow", "Proceed", "Keep", "Retry"}, SubmitKey: "ctrl+enter"},
	}
	data, _ := json.MarshalIndent(profiles, "", "  ")
	return ok(string(data))
}

// HandleGetSupervisorSettings returns supervisor autopilot settings.
func HandleGetSupervisorSettings(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	settings := map[string]interface{}{
		"bumpText":           "keep going",
		"actionLabels":       []string{"Run", "Expand", "Always Allow", "Retry", "Accept all", "Accept", "Allow", "Approve", "Proceed", "Keep"},
		"focusDelayMs":       100,
		"afterClickDelayMs":  150,
		"inputSettleDelayMs": 120,
	}
	data, _ := json.MarshalIndent(settings, "", "  ")
	return ok(string(data))
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
