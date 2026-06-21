package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	searchURL = "https://kyfw.12306.cn/otn/leftTicket/queryZ?leftTicketDTO.train_date=%s&leftTicketDTO.from_station=%s&leftTicketDTO.to_station=%s&purpose_codes=ADULT"
)

func HandleSearchTicket(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	date, _ :=getString(args, "date")
	from, _ :=getString(args, "from")
	to, _ :=getString(args, "to")

	if date == "" || from == "" || to == "" {
		return err("missing required parameters: date, from, to")
}

	// Convert station names to 12306 format (e.g., "北京" -> "BJP")
	fromCode, e := getStationCode(from)
	if e != nil {
		return err(e.Error())
}

	toCode, e := getStationCode(to)
	if e != nil {
		return err(e.Error())
}

	// Build the request URL
	reqURL := fmt.Sprintf(searchURL, date, fromCode, toCode)

	// Create HTTP client with timeout
	client := http.DefaultClient

	// Make the request
	resp, e := client.Get(reqURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	// Read response body
	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return err(e.Error())
}

	// Parse JSON response
	var result map[string]interface{}
	if e := json.Unmarshal(body, &result); e != nil {
		return err(e.Error())
}

	// Extract ticket data
	data, found := result["data"].(map[string]interface{})
	if !found {
		return err("invalid response format")
}

	// Format the response
	var response strings.Builder
	response.WriteString("12306 Ticket Search Results:\n")
	response.WriteString(fmt.Sprintf("Date: %s, From: %s (%s), To: %s (%s)\n\n",
		date, from, fromCode, to, toCode))

	if resultMap, found := data["result"].([]interface{}); found {
		for _, item := range resultMap {
			if s, found := item.(string); found {
				parts := strings.Split(s, "|")
				if len(parts) >= 33 {
					response.WriteString(fmt.Sprintf("Train: %s, From: %s, To: %s, Time: %s-%s, Duration: %s, Price: %s\n",
						parts[3], parts[6], parts[7], parts[8], parts[9], parts[10], parts[31]))

			}
		}
	} else {
		response.WriteString("No tickets available for this route.\n")

	return ok(response.String())
}

}
}

func getStationCode(stationName string) (string, error) {
	// This is a simplified version - in a real implementation you would need a complete mapping
	// of station names to codes or query the 12306 API for station codes
	stationMap := map[string]string{
		"北京":     "BJP",
		"上海":     "SHH",
		"广州":     "GZQ",
		"深圳":     "SZX",
		"成都":     "CDW",
		"重庆":     "CQW",
		"武汉":     "WHN",
		"西安":     "XAN",
		"杭州":     "HZH",
		"南京":     "NJK",
	}

	code, found := stationMap[stationName]
	if !found {
		return "", fmt.Errorf("unknown station: %s", stationName)
}

	return code, nil
}

func HandleStationCode(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	station, _ :=getString(args, "station")
	if station == "" {
		return err("missing required parameter: station")
}

	code, e := getStationCode(station)
	if e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Station code for %s is %s", station, code))
}

func HandleTicketHelp(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	helpText := `12306 Ticket Search Server Help:
1. Search for tickets: call "search_ticket" with parameters:
   - date: YYYY-MM-DD format
   - from: departure station name
   - to: arrival station name

2. Get station code: call "station_code" with parameter:
   - station: station name

Example:
search_ticket(date="2023-12-25", from="北京", to="上海")
station_code(station="广州")`

	return ok(helpText)
}