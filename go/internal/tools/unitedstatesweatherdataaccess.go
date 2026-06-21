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

const weatherAPIBaseURL = "https://api.weather.gov"

func HandleCurrentWeather(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	latitude, _ :=getString(args, "latitude")
	longitude, _ :=getString(args, "longitude")

	if latitude == "" || longitude == "" {
		return err("latitude and longitude are required")
}

	pointURL := fmt.Sprintf("%s/points/%s,%s", weatherAPIBaseURL, latitude, longitude)
	resp, e := http.Get(pointURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var pointData struct {
		Properties struct {
			Forecast string `json:"forecast"`
		} `json:"properties"`
	}

	if e := json.NewDecoder(resp.Body).Decode(&pointData); e != nil {
		return err(e.Error())
}

	forecastURL := pointData.Properties.Forecast
	resp, e = http.Get(forecastURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var forecastData struct {
		Properties struct {
			Periods []struct {
				Temperature     float64 `json:"temperature"`
				TemperatureUnit string  `json:"temperatureUnit"`
				ShortForecast   string  `json:"shortForecast"`
				StartTime       string  `json:"startTime"`
			} `json:"periods"`
		} `json:"properties"`
	}

	if e := json.NewDecoder(resp.Body).Decode(&forecastData); e != nil {
		return err(e.Error())
}

	if len(forecastData.Properties.Periods) == 0 {
		return err("no forecast data available")
}

	current := forecastData.Properties.Periods[0]
	return ok(fmt.Sprintf(
}
		"Current weather: %s, Temperature: %.1f°%s",
		current.ShortForecast,
		current.Temperature,
		current.TemperatureUnit,
	))

func HandleWeatherAlerts(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	latitude, _ :=getString(args, "latitude")
	longitude, _ :=getString(args, "longitude")

	if latitude == "" || longitude == "" {
		return err("latitude and longitude are required")
}

	pointURL := fmt.Sprintf("%s/points/%s,%s", weatherAPIBaseURL, latitude, longitude)
	resp, e := http.Get(pointURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var pointData struct {
		Properties struct {
			Alerts string `json:"alerts"`
		} `json:"properties"`
	}

	if e := json.NewDecoder(resp.Body).Decode(&pointData); e != nil {
		return err(e.Error())
}

	if pointData.Properties.Alerts == "" {
		return ok("No active weather alerts in this area")
}

	resp, e = http.Get(pointData.Properties.Alerts)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var alertsData struct {
		Features []struct {
			Properties struct {
				Event        string `json:"event"`
				Description  string `json:"description"`
				Instruction  string `json:"instruction"`
				StartTime    string `json:"start"`
				EndTime      string `json:"end"`
				Severity     string `json:"severity"`
				Certainty    string `json:"certainty"`
				Urgency      string `json:"urgency"`
				Headline     string `json:"headline"`
				Effective    string `json:"effective"`
				Expires      string `json:"expires"`
				Status       string `json:"status"`
				GeoType      string `json:"geoType"`
				GeoActual    string `json:"geoActual"`
				GeoReference string `json:"geoReference"`
			} `json:"properties"`
		} `json:"features"`
	}

	if e := json.NewDecoder(resp.Body).Decode(&alertsData); e != nil {
		return err(e.Error())
}

	if len(alertsData.Features) == 0 {
		return ok("No active weather alerts in this area")
}

	var alertMessages []string
	for _, alert := range alertsData.Features {
		properties := alert.Properties
		alertMessages = append(alertMessages, fmt.Sprintf(
			"Alert: %s\nEvent: %s\nDescription: %s\nInstruction: %s\nStart: %s\nEnd: %s\nSeverity: %s\nCertainty: %s\nUrgency: %s\n",
			properties.Headline,
			properties.Event,
			properties.Description,
			properties.Instruction,
			properties.StartTime,
			properties.EndTime,
			properties.Severity,
			properties.Certainty,
			properties.Urgency,
		))

	return ok(strings.Join(alertMessages, "\n"))
}

}

func HandleHourlyForecast(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	latitude, _ :=getString(args, "latitude")
	longitude, _ :=getString(args, "longitude")

	if latitude == "" || longitude == "" {
		return err("latitude and longitude are required")
}

	pointURL := fmt.Sprintf("%s/points/%s,%s", weatherAPIBaseURL, latitude, longitude)
	resp, e := http.Get(pointURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var pointData struct {
		Properties struct {
			ForecastHourly string `json:"forecastHourly"`
		} `json:"properties"`
	}

	if e := json.NewDecoder(resp.Body).Decode(&pointData); e != nil {
		return err(e.Error())
}

	resp, e = http.Get(pointData.Properties.ForecastHourly)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var forecastData struct {
		Properties struct {
			Periods []struct {
				Temperature     float64 `json:"temperature"`
				TemperatureUnit string  `json:"temperatureUnit"`
				ShortForecast   string  `json:"shortForecast"`
				StartTime       string  `json:"startTime"`
			} `json:"periods"`
		} `json:"properties"`
	}

	if e := json.NewDecoder(resp.Body).Decode(&forecastData); e != nil {
		return err(e.Error())
}

	if len(forecastData.Properties.Periods) == 0 {
		return err("no hourly forecast data available")
}

	var forecastMessages []string
	for _, period := range forecastData.Properties.Periods {
		forecastMessages = append(forecastMessages, fmt.Sprintf(
			"%s: %s, Temperature: %.1f°%s",
			period.StartTime,
			period.ShortForecast,
			period.Temperature,
			period.TemperatureUnit,
		))

	return ok(strings.Join(forecastMessages, "\n"))
}
}