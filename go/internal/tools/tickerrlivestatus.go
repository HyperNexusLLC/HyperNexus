package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const tickerrAPI = "https://api.tickerr.com/v1"

func HandleStatus(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("api_key is required")
}

	client := http.DefaultClient
	req, e := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/status", tickerrAPI), nil)
	if e != nil {
		return err(e.Error())
}

	q := req.URL.Query()
	q.Add("api_key", apiKey)
	req.URL.RawQuery = q.Encode()

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API error: %s", resp.Status))
}

	var result struct {
		Status string `json:"status"`
	}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Tickerr Live Status: %s", result.Status))
}

func HandleUptime(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("api_key is required")
}

	client := http.DefaultClient
	req, e := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/uptime", tickerrAPI), nil)
	if e != nil {
		return err(e.Error())
}

	q := req.URL.Query()
	q.Add("api_key", apiKey)
	req.URL.RawQuery = q.Encode()

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API error: %s", resp.Status))
}

	var result struct {
		Uptime string `json:"uptime"`
	}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Tickerr Uptime: %s", result.Uptime))
}

func HandleIncidents(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("api_key is required")
}

	client := http.DefaultClient
	req, e := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/incidents", tickerrAPI), nil)
	if e != nil {
		return err(e.Error())
}

	q := req.URL.Query()
	q.Add("api_key", apiKey)
	req.URL.RawQuery = q.Encode()

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API error: %s", resp.Status))
}

	var result struct {
		Incidents []struct {
			ID        string `json:"id"`
			Title     string `json:"title"`
			Status    string `json:"status"`
			CreatedAt string `json:"created_at"`
		} `json:"incidents"`
	}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	if len(result.Incidents) == 0 {
		return ok("No active incidents")
}

	var sb strings.Builder
	sb.WriteString("Active Incidents:\n")
	for _, inc := range result.Incidents {
		sb.WriteString(fmt.Sprintf("- %s (%s): %s (created at %s)\n",
			inc.ID, inc.Status, inc.Title, inc.CreatedAt))

	return ok(sb.String())
}
}