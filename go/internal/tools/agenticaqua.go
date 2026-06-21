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
	"strconv"
	"strings"
	"time"
)

func HandleSearch(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	query, _ :=getString(args, "query")
	if query == "" {
		return err("query parameter is required")
}

	client := http.Client{Timeout: 30 * time.Second}
	resp, e := client.Get("https://www.google.com/search?q=" + url.QueryEscape(query))
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("search failed with status: %s", resp.Status))
}

	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return err(e.Error())
}

	return ok(string(body))
}

func HandleExecuteCommand(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	command, _ :=getString(args, "command")
	if command == "" {
		return err("command parameter is required")
}

	cmd := exec.CommandContext(ctx, "sh", "-c", command)
	output, e := cmd.CombinedOutput()
	if e != nil {
		return err(fmt.Sprintf("command failed: %s", e.Error()))
}

	return ok(string(output))
}

func HandleFileRead(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	path, _ :=getString(args, "path")
	if path == "" {
		return err("path parameter is required")
}

	content, e := os.ReadFile(path)
	if e != nil {
		return err(e.Error())
}

	return ok(string(content))
}

func HandleRegexMatch(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	text, _ :=getString(args, "text")
	pattern, _ :=getString(args, "pattern")
	if text == "" || pattern == "" {
		return err("text and pattern parameters are required")
}

	re, e := regexp.Compile(pattern)
	if e != nil {
		return err(e.Error())
}

	matches := re.FindAllString(text, -1)
	if len(matches) == 0 {
		return ok("no matches found")
}

	return ok(strings.Join(matches, "\n"))
}

func HandleJSONParse(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	jsonStr, _ :=getString(args, "json")
	if jsonStr == "" {
		return err("json parameter is required")
}

	var data interface{}
	e := json.Unmarshal([]byte(jsonStr), &data)
	if e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("%+v", data))
}

func HandleTimeNow(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	format, _ :=getString(args, "format")
	if format == "" {
		format = time.RFC3339
	}

	now := time.Now().Format(format)
	return ok(now)
}