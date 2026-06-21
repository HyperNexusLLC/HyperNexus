package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	dtEnvironmentVar = "DT_ENVIRONMENT"
	dtAPIKeyVar      = "DT_API_KEY"
)

var http.DefaultClient = http.DefaultClient

func getDynatraceEnv() string {
	return os.Getenv(dtEnvironmentVar)
}

func getDynatraceAPIKey() string {
	return os.Getenv(dtAPIKeyVar)
}

func createAuthenticatedRequest(method, path string, body []byte) (*http.Request, error) {
	env := getDynatraceEnv()
	if env == "" {
		return nil, fmt.Errorf("environment variable %s not set", dtEnvironmentVar)
}

	apiKey := getDynatraceAPIKey()
	if apiKey == "" {
		return nil, fmt.Errorf("environment variable %s not set", dtAPIKeyVar)
}

	u, e := url.Parse(env)
	if e != nil {
		return nil, fmt.Errorf("invalid environment URL: %w", e)
}

	u.Path = path
	req, e := http.NewRequest(method, u.String(), strings.NewReader(string(body)))
	if e != nil {
		return nil, fmt.Errorf("failed to create request: %w", e)
}

	req.Header.Set("Authorization", "Api-Token "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	return req, nil
}

func HandleListProblems(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	entityId, _ :=getString(args, "entityId")
	if entityId == "" {
		return err("entityId is required")
}

	path := fmt.Sprintf("/api/v2/problems?entityIds=%s", entityId)
	req, e := createAuthenticatedRequest("GET", path, nil)
	if e != nil {
		return err(e.Error())
}

	resp, e := http.DefaultClient.Do(req.WithContext(ctx))
	if e != nil {
		return err(fmt.Sprintf("failed to execute request: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result struct {
		Problems []struct {
			ID          string `json:"id"`
			Title       string `json:"title"`
			Severity    string `json:"severity"`
			Status      string `json:"status"`
			EntityCount int    `json:"entityCount"`
		} `json:"problems"`
	}

	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	if len(result.Problems) == 0 {
		return ok("No problems found for the given entity")
}

	var response strings.Builder
	response.WriteString(fmt.Sprintf("Found %d problems for entity %s:\n", len(result.Problems), entityId))

	for i, problem := range result.Problems {
		response.WriteString(fmt.Sprintf("%d. %s (ID: %s, Severity: %s, Status: %s, Entities: %d)\n",
			i+1, problem.Title, problem.ID, problem.Severity, problem.Status, problem.EntityCount))

	return ok(response.String())
}

}

func HandleGetProblemDetails(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	problemId, _ :=getString(args, "problemId")
	if problemId == "" {
		return err("problemId is required")
}

	path := fmt.Sprintf("/api/v2/problems/%s", problemId)
	req, e := createAuthenticatedRequest("GET", path, nil)
	if e != nil {
		return err(e.Error())
}

	resp, e := http.DefaultClient.Do(req.WithContext(ctx))
	if e != nil {
		return err(fmt.Sprintf("failed to execute request: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result struct {
		ID          string `json:"id"`
		Title       string `json:"title"`
		Severity    string `json:"severity"`
		Status      string `json:"status"`
		EntityCount int    `json:"entityCount"`
		CreatedAt   string `json:"createdAt"`
		LastUpdated string `json:"lastUpdated"`
	}

	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	response := fmt.Sprintf("Problem Details:\n" +
		"ID: %s\n" +
		"Title: %s\n" +
		"Severity: %s\n" +
		"Status: %s\n" +
		"Entities Affected: %d\n" +
		"Created: %s\n" +
		"Last Updated: %s",
		result.ID, result.Title, result.Severity, result.Status,
		result.EntityCount, result.CreatedAt, result.LastUpdated)

	return ok(response)
}

func HandleGetEntityDetails(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	entityId, _ :=getString(args, "entityId")
	if entityId == "" {
		return err("entityId is required")
}

	path := fmt.Sprintf("/api/v2/entities/%s", entityId)
	req, e := createAuthenticatedRequest("GET", path, nil)
	if e != nil {
		return err(e.Error())
}

	resp, e := http.DefaultClient.Do(req.WithContext(ctx))
	if e != nil {
		return err(fmt.Sprintf("failed to execute request: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result struct {
		ID          string `json:"id"`
		DisplayName string `json:"displayName"`
		Type        string `json:"type"`
		Status      string `json:"status"`
		LastUpdated string `json:"lastUpdated"`
	}

	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	response := fmt.Sprintf("Entity Details:\n" +
		"ID: %s\n" +
		"Display Name: %s\n" +
		"Type: %s\n" +
		"Status: %s\n" +
		"Last Updated: %s",
		result.ID, result.DisplayName, result.Type, result.Status, result.LastUpdated)

	return ok(response)
}