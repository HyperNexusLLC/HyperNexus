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

const subwayAPIBase = "http://api.mta.info/Dataservice"

func HandleSubwayStatus(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("API key is required")
}

	client := http.DefaultClient
	apiURL := fmt.Sprintf("%s/status/v1/LIRR/status.json?api_key=%s", subwayAPIBase, apiKey)

	resp, e := client.Get(apiURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result struct {
		Status struct {
			Incidents []struct {
				Description string `json:"description"`
				Lines       string `json:"lines"`
			} `json:"incidents"`
		} `json:"status"`
	}

	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	if len(result.Status.Incidents) == 0 {
		return ok("No subway incidents reported at this time")
}

	var sb strings.Builder
	for _, incident := range result.Status.Incidents {
		sb.WriteString(fmt.Sprintf("Lines %s: %s\n", incident.Lines, incident.Description))

	return ok(sb.String())
}

}

func HandleSubwayTime(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	station, _ :=getString(args, "station")
	if apiKey == "" || station == "" {
		return err("API key and station are required")
}

	client := http.DefaultClient
	apiURL := fmt.Sprintf("%s/ezpass/v1/ezpass.json?api_key=%s&station=%s", subwayAPIBase, apiKey, url.QueryEscape(station))

	resp, e := client.Get(apiURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result struct {
		Data struct {
			Entries []struct {
				StationName string `json:"station_name"`
				Time        string `json:"time"`
			} `json:"entries"`
		} `json:"data"`
	}

	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	if len(result.Data.Entries) == 0 {
		return ok(fmt.Sprintf("No arrival times found for station: %s", station))
}

	var sb strings.Builder
	for _, entry := range result.Data.Entries {
		sb.WriteString(fmt.Sprintf("Next train at %s: %s\n", entry.StationName, entry.Time))

	return ok(sb.String())
}

}

func HandleSubwayLines(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("API key is required")
}

	client := http.DefaultClient
	apiURL := fmt.Sprintf("%s/lines/v1/lines.json?api_key=%s", subwayAPIBase, apiKey)

	resp, e := client.Get(apiURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result struct {
		Lines []struct {
			LineName string `json:"line_name"`
			Color    string `json:"color"`
		} `json:"lines"`
	}

	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	if len(result.Lines) == 0 {
		return ok("No subway lines found")
}

	var sb strings.Builder
	for _, line := range result.Lines {
		sb.WriteString(fmt.Sprintf("%s (%s)\n", line.LineName, line.Color))

	return ok(sb.String())
}
}