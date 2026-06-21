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
	"strconv"
	"strings"
	"time"
)

const gerritAPI = "https://gerrit.example.com/a/"

var http.DefaultClient = http.DefaultClient

func HandleGerritQuery(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	query, _ :=getString(args, "query")
	if query == "" {
		return err("query parameter is required")
}

	apiURL := gerritAPI + "changes/?q=" + url.QueryEscape(query)
	resp, e := http.DefaultClient.Get(apiURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed: %s", resp.Status))
}

	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return err(e.Error())
}

	return ok(string(body))
}

func HandleGerritSubmit(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	changeID, _ :=getString(args, "change_id")
	if changeID == "" {
		return err("change_id parameter is required")
}

	apiURL := gerritAPI + "changes/" + changeID + "/submit"
	resp, e := http.DefaultClient.Post(apiURL, "application/json", nil)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("Submit failed: %s", resp.Status))
}

	return ok(fmt.Sprintf("Successfully submitted change %s", changeID))
}

func HandleGerritReview(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	changeID, _ :=getString(args, "change_id")
	if changeID == "" {
		return err("change_id parameter is required")
}

	score, _ :=getInt(args, "score")
	if score < -2 || score > 2 {
		return err("score must be between -2 and 2")
}

	apiURL := gerritAPI + "changes/" + changeID + "/review"
	payload := map[string]interface{}{
		"labels": map[string]interface{}{
			"Code-Review": score,
		},
	}
	jsonPayload, e := json.Marshal(payload)
	if e != nil {
		return err(e.Error())
}

	resp, e := http.DefaultClient.Post(apiURL, "application/json", strings.NewReader(string(jsonPayload)))
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("Review failed: %s", resp.Status))
}

	return ok(fmt.Sprintf("Successfully reviewed change %s with score %d", changeID, score))
}

func HandleGerritClone(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	changeID, _ :=getString(args, "change_id")
	if changeID == "" {
		return err("change_id parameter is required")
}

	dir, _ :=getString(args, "dir")
	if dir == "" {
		dir = "."
	}

	apiURL := gerritAPI + "changes/" + changeID + "/revisions/current"
	resp, e := http.DefaultClient.Get(apiURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed: %s", resp.Status))
}

	var data struct {
		Project string `json:"project"`
		Branch  string `json:"branch"`
	}
	e = json.NewDecoder(resp.Body).Decode(&data)
	if e != nil {
		return err(e.Error())
}

	gitURL := fmt.Sprintf("ssh://gerrit.example.com:29418/%s", data.Project)
	cmd := exec.Command("git", "clone", gitURL, filepath.Join(dir, data.Project))
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	e = cmd.Run()
	if e != nil {
		return err(e.Error())
}

	cmd = exec.Command("git", "checkout", data.Branch)
	cmd.Dir = filepath.Join(dir, data.Project)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	e = cmd.Run()
	if e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Successfully cloned %s into %s", gitURL, dir))
}

func HandleGerritListChanges(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	limit, _ :=getInt(args, "limit")
	if limit <= 0 {
		limit = 10
	}

	
	return ok("not yet implemented")
}