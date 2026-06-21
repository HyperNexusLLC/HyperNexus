package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func HandleDocPull(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	urlStr, _ :=getString(args, "url")
	if urlStr == "" {
		return err("url parameter is required")
}

	parsedURL, e := url.Parse(urlStr)
	if e != nil {
		return err(fmt.Sprintf("invalid URL: %v", e))
}

	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return err("only http and https URLs are supported")
}

	client := http.DefaultClient
	resp, e := client.Get(urlStr)
	if e != nil {
		return err(fmt.Sprintf("failed to fetch URL: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("HTTP error: %s", resp.Status))
}

	contentType := resp.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "text/") && contentType != "application/json" {
		return err("unsupported content type: " + contentType)
}

	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return err(fmt.Sprintf("failed to read response body: %v", e))
}

	if strings.HasPrefix(contentType, "text/plain") {
		return ok(string(body))
}

	if contentType == "application/json" {
		var prettyJSON bytes.Buffer
		if e := json.Indent(&prettyJSON, body, "", "  "); e != nil {
			return ok(string(body)) // return as-is if pretty-print fails
		}
		return ok(prettyJSON.String())
}

	return ok(string(body))
}

func HandleDocSave(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	urlStr, _ :=getString(args, "url")
	if urlStr == "" {
		return err("url parameter is required")
}

	filename, _ :=getString(args, "filename")
	if filename == "" {
		return err("filename parameter is required")
}

	client := http.DefaultClient
	resp, e := client.Get(urlStr)
	if e != nil {
		return err(fmt.Sprintf("failed to fetch URL: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("HTTP error: %s", resp.Status))
}

	// Create directory if it doesn't exist
	dir := filepath.Dir(filename)
	if dir != "" {
		if e := os.MkdirAll(dir, 0755); e != nil {
			return err(fmt.Sprintf("failed to create directory: %v", e))

	}

	file, e := os.Create(filename)
	if e != nil {
		return err(fmt.Sprintf("failed to create file: %v", e))
}

	defer file.Close()

	_, e = io.Copy(file, resp.Body)
	if e != nil {
		return err(fmt.Sprintf("failed to save file: %v", e))
}

	return ok(fmt.Sprintf("Successfully saved to %s", filename))
}

}

func HandleDocInfo(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	urlStr, _ :=getString(args, "url")
	if urlStr == "" {
		return err("url parameter is required")
}

	client := http.DefaultClient
	resp, e := client.Head(urlStr)
	if e != nil {
		return err(fmt.Sprintf("failed to fetch URL info: %v", e))
}

	defer resp.Body.Close()

	info := fmt.Sprintf("URL: %s\n", urlStr)
	info += fmt.Sprintf("Status: %s\n", resp.Status)
	info += fmt.Sprintf("Content-Type: %s\n", resp.Header.Get("Content-Type"))
	info += fmt.Sprintf("Content-Length: %s\n", resp.Header.Get("Content-Length"))
	info += fmt.Sprintf("Last-Modified: %s\n", resp.Header.Get("Last-Modified"))

	return ok(info)
}