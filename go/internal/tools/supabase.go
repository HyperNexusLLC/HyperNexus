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

const supabaseBaseURL = "https://api.supabase.com/v1"

type SupabaseResponse struct {
	Data    interface{} `json:"data"`
	Error   string      `json:"error"`
	Message string      `json:"message"`
}

func HandleSupabaseQuery(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("api_key is required")
}

	table, _ :=getString(args, "table")
	if table == "" {
		return err("table is required")
}

	selectFields, _ :=getString(args, "select")
	whereClause, _ :=getString(args, "where")
	limit, _ :=getInt(args, "limit")

	client := http.DefaultClient

	queryURL := fmt.Sprintf("%s/rest/data/%s", supabaseBaseURL, table)
	queryParams := url.Values{}

	if selectFields != "" {
		queryParams.Add("select", selectFields)

	if whereClause != "" {
		queryParams.Add("where", whereClause)

	if limit > 0 {
		queryParams.Add("limit", fmt.Sprintf("%d", limit))

	queryURL += "?" + queryParams.Encode()

	req, e := http.NewRequestWithContext(ctx, "GET", queryURL, nil)
	if e != nil {
		return err(e.Error())
}

	req.Header.Add("apikey", apiKey)
	req.Header.Add("Content-Type", "application/json")

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result SupabaseResponse
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	if result.Error != "" {
		return err(result.Error)
}

	return ok(fmt.Sprintf("Query successful. Results: %v", result.Data))
}

}
}
}

func HandleSupabaseInsert(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("api_key is required")
}

	table, _ :=getString(args, "table")
	if table == "" {
		return err("table is required")
}

	data := args["data"]
	if data == nil {
		return err("data is required")
}

	dataBytes, e := json.Marshal(data)
	if e != nil {
		return err(e.Error())
}

	client := http.DefaultClient

	insertURL := fmt.Sprintf("%s/rest/data/%s", supabaseBaseURL, table)

	req, e := http.NewRequestWithContext(ctx, "POST", insertURL, strings.NewReader(string(dataBytes)))
	if e != nil {
		return err(e.Error())
}

	req.Header.Add("apikey", apiKey)
	req.Header.Add("Content-Type", "application/json")

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result SupabaseResponse
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	if result.Error != "" {
		return err(result.Error)
}

	return ok(fmt.Sprintf("Insert successful. Result: %v", result.Data))
}

func HandleSupabaseUpdate(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("api_key is required")
}

	table, _ :=getString(args, "table")
	if table == "" {
		return err("table is required")
}

	data := args["data"]
	if data == nil {
		return err("data is required")
}

	whereClause, _ :=getString(args, "where")
	if whereClause == "" {
		return err("where clause is required for update")
}

	dataBytes, e := json.Marshal(data)
	if e != nil {
		return err(e.Error())
}

	client := http.DefaultClient

	updateURL := fmt.Sprintf("%s/rest/data/%s", supabaseBaseURL, table)
	queryParams := url.Values{}
	queryParams.Add("where", whereClause)
	updateURL += "?" + queryParams.Encode()

	req, e := http.NewRequestWithContext(ctx, "PATCH", updateURL, strings.NewReader(string(dataBytes)))
	if e != nil {
		return err(e.Error())
}

	req.Header.Add("apikey", apiKey)
	req.Header.Add("Content-Type", "application/json")

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result SupabaseResponse
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	if result.Error != "" {
		return err(result.Error)
}

	return ok(fmt.Sprintf("Update successful. Result: %v", result.Data))
}