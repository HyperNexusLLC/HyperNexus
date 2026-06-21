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

// ToolResponse is a placeholder for the response structure.

// Content represents a single content item.
type Content struct {
	URI      string
	Text     string
	MimeType string
}

// ok returns a success response and error.
func ok(content Content) (ToolResponse, error) {
	return ToolResponse{Contents: []Content{content}}, nil
}

// e returns an error.
func err(e error) (ToolResponse, error) {
	return ToolResponse{}, e
}

// getString retrieves a string value from the args map.
func getString(args map[string]interface{}, key string) (string, error) {
	val, found := args[key]
	if !found {
		return "", fmt.Errorf("missing argument: %s", key)
}

	strVal, found := val.(string)
	if !found {
		return "", fmt.Errorf("argument %s is not a string", key)
}

	return strVal, nil
}

// getInt retrieves an integer value from the args map.
func getInt(args map[string]interface{}, key string) (int, error) {
	val, found := args[key]
	if !found {
		return 0, fmt.Errorf("missing argument: %s", key)
}

	intVal, found := val.(int)
	if !found {
		return 0, fmt.Errorf("argument %s is not an integer", key)
}

	return intVal, nil
}

// getBool retrieves a boolean value from the args map.
func getBool(args map[string]interface{}, key string) (bool, error) {
	val, found := args[key]
	if !found {
		return false, fmt.Errorf("missing argument: %s", key)
}

	boolVal, found := val.(bool)
	if !found {
		return false, fmt.Errorf("argument %s is not a boolean", key)
}

	return boolVal, nil
}

// HandleConversationsList handles the conversations list request.
func HandleConversationsList(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	client := http.DefaultClient
	resp, e := client.Get("https://api.graphlit.com/queryConversations")
	if e != nil {
		return err(e)
}

	defer resp.Body.Close()

	var conversations ConversationsResponse
	if e := json.NewDecoder(resp.Body).Decode(&conversations); e != nil {
		return err(e)
}

	contents := make([]Content, 0, len(conversations.Conversations.Results))
	for _, conversation := range conversations.Conversations.Results {
		contents = append(contents, Content{
			URI:      fmt.Sprintf("conversations://%s", conversation.ID),
			Text:     conversation.Name,
			MimeType: "text/markdown",
		})

	return ok(contents)
}

}

// HandleConversation handles the conversation request.
func HandleConversation(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	id, _ :=getString(args, "id")
	if e != nil {
		return err(e)
}

	client := http.DefaultClient
	resp, e := client.Get(fmt.Sprintf("https://api.graphlit.com/getConversation?id=%s", id))
	if e != nil {
		return err(e)
}

	defer resp.Body.Close()

	var conversation ConversationResponse
	if e := json.NewDecoder(resp.Body).Decode(&conversation); e != nil {
		return err(e)
}

	return ok(Content{
}
		URI:      fmt.Sprintf("conversations://%s", conversation.Conversation.ID),
		Text:     conversation.Conversation.Text,
		MimeType: "text/markdown",
	})

// HandleFeedsList handles the feeds list request.
func HandleFeedsList(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	client := http.DefaultClient
	resp, e := client.Get("https://api.graphlit.com/queryFeeds")
	if e != nil {
		return err(e)
}

	defer resp.Body.Close()

	var feeds FeedsResponse
	if e := json.NewDecoder(resp.Body).Decode(&feeds); e != nil {
		return err(e)
}

	contents := make([]Content, 0, len(feeds.Feeds.Results))
	for _, feed := range feeds.Feeds.Results {
		contents = append(contents, Content{
			URI:      fmt.Sprintf("feeds://%s", feed.ID),
			Text:     feed.Name,
			MimeType: "text/markdown",
		})

	return ok(contents)
}
}