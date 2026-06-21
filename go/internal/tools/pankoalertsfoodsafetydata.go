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

const (
	pankoAlertsBaseURL = "https://www.pankoalerts.com/api/v1"
)

func HandleGetFoodSafetyAlerts(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	product, _ :=getString(args, "product")
	country, _ :=getString(args, "country")
	severity, _ :=getString(args, "severity")

	params := url.Values{}
	if product != "" {
		params.Add("product", product)

	if country != "" {
		params.Add("country", country)

	if severity != "" {
		params.Add("severity", severity)

	client := http.DefaultClient
	reqURL := fmt.Sprintf("%s/alerts?%s", pankoAlertsBaseURL, params.Encode())
	req, e := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if e != nil {
		return err(e.Error())
}

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var alerts []map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&alerts); e != nil {
		return err(e.Error())
}

	if len(alerts) == 0 {
		return ok("No food safety alerts found matching the criteria")
}

	var response strings.Builder
	response.WriteString("Food Safety Alerts:\n")
	for i, alert := range alerts {
		response.WriteString(fmt.Sprintf("%d. %s\n", i+1, alert["title"]))
		response.WriteString(fmt.Sprintf("   - Product: %s\n", alert["product"]))
		response.WriteString(fmt.Sprintf("   - Country: %s\n", alert["country"]))
		response.WriteString(fmt.Sprintf("   - Severity: %s\n", alert["severity"]))
		response.WriteString(fmt.Sprintf("   - Date: %s\n", alert["date"]))
		response.WriteString(fmt.Sprintf("   - Description: %s\n", alert["description"]))
		response.WriteString("\n")

	return ok(response.String())
}

}
}
}
}

func HandleGetRecentRecalls(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	days, _ :=getInt(args, "days")
	if days <= 0 {
		days = 7 // default to last 7 days
	}

	client := http.DefaultClient
	reqURL := fmt.Sprintf("%s/recalls?days=%d", pankoAlertsBaseURL, days)
	req, e := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if e != nil {
		return err(e.Error())
}

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var recalls []map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&recalls); e != nil {
		return err(e.Error())
}

	if len(recalls) == 0 {
		return ok(fmt.Sprintf("No food recalls found in the last %d days", days))
}

	var response strings.Builder
	response.WriteString(fmt.Sprintf("Recent Food Recalls (last %d days):\n", days))
	for i, recall := range recalls {
		response.WriteString(fmt.Sprintf("%d. %s\n", i+1, recall["title"]))
		response.WriteString(fmt.Sprintf("   - Product: %s\n", recall["product"]))
		response.WriteString(fmt.Sprintf("   - Reason: %s\n", recall["reason"]))
		response.WriteString(fmt.Sprintf("   - Date: %s\n", recall["date"]))
		response.WriteString("\n")

	return ok(response.String())
}

}

func HandleGetFoodSafetyStatistics(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	country, _ :=getString(args, "country")
	if country == "" {
		return err("country parameter is required")
}

	client := http.DefaultClient
	reqURL := fmt.Sprintf("%s/stats?country=%s", pankoAlertsBaseURL, url.QueryEscape(country))
	req, e := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if e != nil {
		return err(e.Error())
}

	resp, e := client.Do(req)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var stats map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&stats); e != nil {
		return err(e.Error())
}

	if len(stats) == 0 {
		return ok(fmt.Sprintf("No food safety statistics found for %s", country))
}

	var response strings.Builder
	response.WriteString(fmt.Sprintf("Food Safety Statistics for %s:\n", country))
	response.WriteString(fmt.Sprintf("Total Alerts: %d\n", stats["total_alerts"]))
	response.WriteString(fmt.Sprintf("High Severity: %d\n", stats["high_severity"]))
	response.WriteString(fmt.Sprintf("Medium Severity: %d\n", stats["medium_severity"]))
	response.WriteString(fmt.Sprintf("Low Severity: %d\n", stats["low_severity"]))
	response.WriteString(fmt.Sprintf("Total Recalls: %d\n", stats["total_recalls"]))
	response.WriteString(fmt.Sprintf("Average Response Time: %s\n", stats["avg_response_time"]))

	return ok(response.String())
}