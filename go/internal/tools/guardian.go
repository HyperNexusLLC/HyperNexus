package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const guardianBaseURL = "https://www.theguardian.com"

func HandleSearch(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	query, _ :=getString(args, "query")
	if query == "" {
		return err("query parameter is required")
}

	client := http.DefaultClient
	resp, e := client.Get(fmt.Sprintf("%s/search?q=%s", guardianBaseURL, url.QueryEscape(query)))
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("HTTP error: %s", resp.Status))
}

	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return err(e.Error())
}

	return ok(string(body))
}

func HandleArticle(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	articleID, _ :=getString(args, "article_id")
	if articleID == "" {
		return err("article_id parameter is required")
}

	client := http.DefaultClient
	resp, e := client.Get(fmt.Sprintf("%s/%s", guardianBaseURL, articleID))
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("HTTP error: %s", resp.Status))
}

	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return err(e.Error())
}

	return ok(string(body))
}

func HandleLatestNews(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	section, _ :=getString(args, "section")
	if section == "" {
		section = "world"
	}

	client := http.DefaultClient
	resp, e := client.Get(fmt.Sprintf("%s/%s/latest", guardianBaseURL, section))
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("HTTP error: %s", resp.Status))
}

	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return err(e.Error())
}

	return ok(string(body))
}

func HandleSaveArticle(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	articleID, _ :=getString(args, "article_id")
	if articleID == "" {
		return err("article_id parameter is required")
}

	filename, _ :=getString(args, "filename")
	if filename == "" {
		filename = fmt.Sprintf("guardian_%s.html", articleID)

	client := http.DefaultClient
	resp, e := client.Get(fmt.Sprintf("%s/%s", guardianBaseURL, articleID))
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("HTTP error: %s", resp.Status))
}

	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return err(e.Error())
}

	e = os.WriteFile(filename, body, 0644)
	if e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Article saved to %s", filename))
}

}

func HandleOpenArticle(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	articleID, _ :=getString(args, "article_id")
	if articleID == "" {
		return err("article_id parameter is required")
}

	// This would typically use a system command to open the URL in the default browser
	cmd := exec.Command("open", fmt.Sprintf("%s/%s", guardianBaseURL, articleID))
	e := cmd.Start()
	if e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Opening article %s in browser", articleID))
}