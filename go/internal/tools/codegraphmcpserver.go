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

var http.DefaultClient = http.DefaultClient

func HandleCodeGraphSearch(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	query, _ :=getString(args, "query")
	if query == "" {
		return err("query parameter is required")
}

	// In a real implementation, this would call the CodeGraph API
	// For this example, we'll simulate a response
	response := fmt.Sprintf("Search results for: %s\n1. ExampleResult1\n2. ExampleResult2", query)
	return ok(response)
}

func HandleCodeGraphGetRepo(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	repo, _ :=getString(args, "repo")
	if repo == "" {
		return err("repo parameter is required")
}

	// Simulate getting repo information
	repoInfo := fmt.Sprintf("Repository: %s\nStars: 42\nForks: 10", repo)
	return ok(repoInfo)
}

func HandleCodeGraphAnalyze(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	repo, _ :=getString(args, "repo")
	if repo == "" {
		return err("repo parameter is required")
}

	// Simulate code analysis
	analysis := fmt.Sprintf("Analysis for %s:\n- Lines of code: 1000\n- Functions: 50\n- Classes: 20", repo)
	return ok(analysis)
}

func HandleCodeGraphClone(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	repo, _ :=getString(args, "repo")
	dest, _ :=getString(args, "dest")
	if repo == "" {
		return err("repo parameter is required")
}

	if dest == "" {
		return err("dest parameter is required")
}

	// Simulate cloning a repository
	cmd := exec.Command("git", "clone", repo, dest)
	output, e := cmd.CombinedOutput()
	if e != nil {
		return err(fmt.Sprintf("clone failed: %s", string(output)))
}

	return ok(fmt.Sprintf("Successfully cloned %s to %s", repo, dest))
}

func HandleCodeGraphListFiles(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	dir, _ :=getString(args, "dir")
	if dir == "" {
		return err("dir parameter is required")
}

	// List files in directory
	files, e := os.ReadDir(dir)
	if e != nil {
		return err(fmt.Sprintf("failed to read directory: %v", e))
}

	var fileList strings.Builder
	for _, file := range files {
		fileList.WriteString(file.Name() + "\n")

	return ok(fileList.String())
}

}

func HandleCodeGraphSearchCode(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	query, _ :=getString(args, "query")
	repo, _ :=getString(args, "repo")
	if query == "" {
		return err("query parameter is required")
}

	if repo == "" {
		return err("repo parameter is required")
}

	// Simulate code search within a repository
	results := fmt.Sprintf("Code search results for '%s' in %s:\n1. match1\n2. match2", query, repo)
	return ok(results)
}