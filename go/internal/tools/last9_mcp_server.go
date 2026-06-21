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

// HandleGetAlertConfig handles the get_alert_config tool
func HandleGetAlertConfig(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	ruleID, _ :=getString(args, "rule_id")
	ruleName, _ :=getString(args, "rule_name")
	severity, _ :=getString(args, "severity")
	ruleType, _ :=getString(args, "rule_type")
	groupName, _ :=getString(args, "alert_group_name")

	queryParams := url.Values{}
	if ruleID != "" {
		queryParams.Add("rule_id", ruleID)

	if ruleName != "" {
		queryParams.Add("rule_name", ruleName)

	if severity != "" {
		queryParams.Add("severity", severity)

	if ruleType != "" {
		queryParams.Add("rule_type", ruleType)

	if groupName != "" {
		queryParams.Add("alert_group_name", groupName)

	apiURL := fmt.Sprintf("https://app.last9.io/api/v4/alerts/config?%s", queryParams.Encode())

	client := http.DefaultClient
	req, e := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if e != nil {
		return err(e.Error())
}

	req.Header.Set("Authorization", "Bearer "+getString(args, "access_token"))
	req.Header.Set("Content-Type", "application/json")

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	return ok(result)
}

}
}
}
}
}

// HandleGetAlertRuleState handles the get_alert_rule_state tool
func HandleGetAlertRuleState(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	startTime, _ :=getString(args, "start_time")
	endTime, _ :=getString(args, "end_time")
	groupID, _ :=getString(args, "alert_group_id")
	ruleName, _ :=getString(args, "rule_name")
	groupName, _ :=getString(args, "alert_group_name")
	labelFilters, _ :=getString(args, "label_filters")
	state, _ :=getString(args, "state")

	queryParams := url.Values{}
	if startTime != "" {
		queryParams.Add("start_time", startTime)

	if endTime != "" {
		queryParams.Add("end_time", endTime)

	if groupID != "" {
		queryParams.Add("alert_group_id", groupID)

	if ruleName != "" {
		queryParams.Add("rule_name", ruleName)

	if groupName != "" {
		queryParams.Add("alert_group_name", groupName)

	if labelFilters != "" {
		queryParams.Add("label_filters", labelFilters)

	if state != "" {
		queryParams.Add("state", state)

	apiURL := fmt.Sprintf("https://app.last9.io/api/v4/alerts/rule_state?%s", queryParams.Encode())

	client := http.DefaultClient
	req, e := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if e != nil {
		return err(e.Error())
}

	req.Header.Set("Authorization", "Bearer "+getString(args, "access_token"))
	req.Header.Set("Content-Type", "application/json")

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	return ok(result)
}

}
}
}
}
}
}
}

// HandleGetLogAttributesForPipeline handles the get_log_attributes_for_pipeline tool
func HandleGetLogAttributesForPipeline(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	serviceName, _ :=getString(args, "service_name")
	env, _ :=getString(args, "env")
	startTime, _ :=getString(args, "start_time")
	endTime, _ :=getString(args, "end_time")

	if serviceName == "" {
		return err("service_name is required")
}

	queryParams := url.Values{}
	queryParams.Add("service_name", serviceName)
	if env != "" {
		queryParams.Add("env", env)

	if startTime != "" {
		queryParams.Add("start_time", startTime)

	if endTime != "" {
		queryParams.Add("end_time", endTime)

	apiURL := fmt.Sprintf("https://app.last9.io/logs/api/v2/series/json?%s", queryParams.Encode())

	client := http.DefaultClient
	req, e := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if e != nil {
		return err(e.Error())
}

	req.Header.Set("Authorization", "Bearer "+getString(args, "access_token"))
	req.Header.Set("Content-Type", "application/json")

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result []map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	// Process the result to add filter_field
	for i := range result {
		field := result[i]["field"].(string)
		result[i]["filter_field"] = fmt.Sprintf("log.%s", strings.ReplaceAll(field, ".", "_"))

	return ok(result)
}

}
}
}
}

// HandleGetTraceAttributeValues handles the get_trace_attribute_values tool
func HandleGetTraceAttributeValues(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	attributeName, _ :=getString(args, "attribute_name")
	serviceName, _ :=getString(args, "service_name")
	env, _ :=getString(args, "env")
	startTime, _ :=getString(args, "start_time")
	endTime, _ :=getString(args, "end_time")

	if attributeName == "" {
		return err("attribute_name is required")
}

	queryParams := url.Values{}
	queryParams.Add("attribute_name", attributeName)
	if serviceName != "" {
		queryParams.Add("service_name", serviceName)

	if env != "" {
		queryParams.Add("env", env)

	if startTime != "" {
		queryParams.Add("start_time", startTime)

	if endTime != "" {
		queryParams.Add("end_time", endTime)

	apiURL := fmt.Sprintf("https://app.last9.io/traces/api/v1/attribute_values?%s", queryParams.Encode())

	client := http.DefaultClient
	req, e := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if e != nil {
		return err(e.Error())
}

	req.Header.Set("Authorization", "Bearer "+getString(args, "access_token"))
	req.Header.Set("Content-Type", "application/json")

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	return ok(result)
}

}
}
}
}

// HandleGetServiceSummary handles the get_service_summary tool
func HandleGetServiceSummary(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	env, _ :=getString(args, "env")
	startTime, _ :=getString(args, "start_time")
	endTime, _ :=getString(args, "end_time")

	queryParams := url.Values{}
	if env != "" {
		queryParams.Add("env", env)

	if startTime != "" {
		queryParams.Add("start_time", startTime)

	if endTime != "" {
		queryParams.Add("end_time", endTime)

	apiURL := fmt.Sprintf("https://app.last9.io/api/v4/services/summary?%s", queryParams.Encode())

	client := http.DefaultClient
	req, e := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if e != nil {
		return err(e.Error())
}

	req.Header.Set("Authorization", "Bearer "+getString(args, "access_token"))
	req.Header.Set("Content-Type", "application/json")

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	return ok(result)
}

}
}
}

// HandleGetServiceEnvironments handles the get_service_environments tool
func HandleGetServiceEnvironments(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	serviceName, _ :=getString(args, "service_name")

	if serviceName == "" {
		return err("service_name is required")
}

	apiURL := fmt.Sprintf("https://app.last9.io/api/v4/services/%s/environments", serviceName)

	client := http.DefaultClient
	req, e := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if e != nil {
		return err(e.Error())
}

	req.Header.Set("Authorization", "Bearer "+getString(args, "access_token"))
	req.Header.Set("Content-Type", "application/json")

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result []string
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	return ok(result)
}