package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

func HandleGitHubRepoInfo(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	repo, _ :=getString(args, "repo")
	if repo == "" {
		return err("repository name is required")
}

	client := http.DefaultClient
	resp, e := client.Get(fmt.Sprintf("https://api.github.com/repos/%s", repo))
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("GitHub API error: %s", resp.Status))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	description := result["description"].(string)
	stars := result["stargazers_count"].(float64)
	issues := result["open_issues_count"].(float64)

	return ok(fmt.Sprintf("Repository: %s\nDescription: %s\nStars: %d\nOpen Issues: %d",
}
		repo, description, int(stars), int(issues)))

func HandleFileSearch(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	dir, _ :=getString(args, "dir")
	pattern, _ :=getString(args, "pattern")
	if dir == "" || pattern == "" {
		return err("directory and pattern are required")
}

	re, e := regexp.Compile(pattern)
	if e != nil {
		return err(e.Error())
}

	var matches []string
	e := filepath.Walk(dir, func(path string, info os.FileInfo, e error) error {
		if e != nil {
			return e
		}
		if !info.IsDir() && re.MatchString(info.Name()) {
			matches = append(matches, path)

		return nil
	})

	if e != nil {
		return err(e.Error())
}

	if len(matches) == 0 {
		return ok("No files found matching the pattern")
}

	sort.Strings(matches)
	return ok(strings.Join(matches, "\n"))
}

}

func HandleProcessList(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	cmd := exec.Command("ps", "aux")
	output, e := cmd.Output()
	if e != nil {
		return err(e.Error())
}

	return ok(string(output))
}

func HandleURLShortener(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	longURL, _ :=getString(args, "url")
	if longURL == "" {
		return err("URL is required")
}

	// Simple URL validation
	if _, e := url.ParseRequestURI(longURL); e != nil {
		return err("Invalid URL format")
}

	// In a real implementation, this would call a URL shortening service
	// For this example, we'll just return a mock shortened URL
	shortURL := fmt.Sprintf("https://short.url/%x", strconv.FormatInt(time.Now().Unix(), 16))

	return ok(fmt.Sprintf("Shortened URL: %s", shortURL))
}

func HandleSystemInfo(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	var info strings.Builder

	// Get hostname
	hostname, e := os.Hostname()
	if e != nil {
		info.WriteString("Hostname: [error]\n")
	} else {
		info.WriteString(fmt.Sprintf("Hostname: %s\n", hostname))

	// Get OS info
	info.WriteString(fmt.Sprintf("OS: %s\n", os.Getenv("OS")))

	// Get CPU info (simple approach)
	info.WriteString("CPU: ")
	cmd := exec.Command("uname", "-m")
	output, e := cmd.Output()
	if e != nil {
		info.WriteString("[error]\n")
	} else {
		info.WriteString(strings.TrimSpace(string(output)) + "\n")

	return ok(info.String())
}

}
}

func HandleJSONValidator(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	jsonStr, _ :=getString(args, "json")
	if jsonStr == "" {
		return err("JSON string is required")
}

	var result interface{}
	if e := json.Unmarshal([]byte(jsonStr), &result); e != nil {
		return err(fmt.Sprintf("Invalid JSON: %s", e.Error()))
}

	return ok("JSON is valid")
}