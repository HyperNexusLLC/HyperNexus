package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

func HandleXkcdForThat(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	searchTerm, _ :=getString(args, "search_term")
	if searchTerm == "" {
		return err("search_term is required")
}

	// Construct the URL for the xkcdforthat API
	apiURL := fmt.Sprintf("https://xkcdforthat.com/api.php?search=%s", url.QueryEscape(searchTerm))

	// Create a new HTTP client with timeout
	client := http.DefaultClient

	// Make the GET request
	resp, e := client.Get(apiURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	// Read the response body
	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return err(e.Error())
}

	// Parse the JSON response
	var result struct {
		Results []struct {
			Title string `json:"title"`
			URL   string `json:"url"`
		} `json:"results"`
	}
	if e := json.Unmarshal(body, &result); e != nil {
		return err(e.Error())
}

	// Format the results
	var output strings.Builder
	for i, comic := range result.Results {
		if i > 0 {
			output.WriteString("\n")

		output.WriteString(fmt.Sprintf("%s: %s", comic.Title, comic.URL))

	if output.Len() == 0 {
		return err("no results found")
}

	return ok(output.String())
}

}
}

func HandleXkcdRandom(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	// Get a random xkcd comic
	apiURL := "https://xkcdforthat.com/api.php?random=1"

	client := http.DefaultClient

	resp, e := client.Get(apiURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return err(e.Error())
}

	var result struct {
		Title string `json:"title"`
		URL   string `json:"url"`
	}
	if e := json.Unmarshal(body, &result); e != nil {
		return err(e.Error())
}

	if result.Title == "" {
		return err("no comic found")
}

	return ok(fmt.Sprintf("%s: %s", result.Title, result.URL))
}

func HandleXkcdLatest(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	// Get the latest xkcd comic
	apiURL := "https://xkcdforthat.com/api.php?latest=1"

	client := http.DefaultClient

	resp, e := client.Get(apiURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return err(e.Error())
}

	var result struct {
		Title string `json:"title"`
		URL   string `json:"url"`
	}
	if e := json.Unmarshal(body, &result); e != nil {
		return err(e.Error())
}

	if result.Title == "" {
		return err("no comic found")
}

	return ok(fmt.Sprintf("%s: %s", result.Title, result.URL))
}