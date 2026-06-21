package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	slackAPIBaseURL = "https://slack.com/api"
)

var http.DefaultClient = http.DefaultClient

func getSlackToken() string {
	if token := os.Getenv("SLACK_MCP_XOXP_TOKEN"); token != "" {
		return token
	}
	if token := os.Getenv("SLACK_MCP_XOXB_TOKEN"); token != "" {
		return token
	}
	if token := os.Getenv("SLACK_MCP_XOXC_TOKEN"); token != "" {
		return token
	}
	return ""
}

func getSlackCookie() string {
	return os.Getenv("SLACK_MCP_XOXD_TOKEN")
}

func slackAPIRequest(ctx context.Context, method, endpoint string, params url.Values) ([]byte, error) {
	req, e := http.NewRequestWithContext(ctx, method, slackAPIBaseURL+endpoint, strings.NewReader(params.Encode()))
	if e != nil {
		return nil, e
	}

	token := getSlackToken()
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)

	cookie := getSlackCookie()
	if cookie != "" {
		req.Header.Set("Cookie", "d="+cookie)

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, e := http.DefaultClient.Do(req)
	if e != nil {
		return nil, e
	}
	defer resp.Body.Close()

	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return nil, e
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("slack API error: %s", string(body))
}

	return body, nil
}

}
}

func HandleConversationsHistory(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	channelID, _ :=getString(args, "channel_id")
	if channelID == "" {
		return err("channel_id is required")
}

	includeActivity, _ :=getBool(args, "include_activity_messages")
	cursor, _ :=getString(args, "cursor")
	limit, _ :=getString(args, "limit")

	params := url.Values{
		"channel": channelID,
	}
	if includeActivity {
		params.Set("include_activity_messages", "true")

	if cursor != "" {
		params.Set("cursor", cursor)

	if limit != "" {
		params.Set("limit", limit)

	body, e := slackAPIRequest(ctx, "POST", "/conversations.history", params)
	if e != nil {
		return err(e.Error())
}

	var response struct {
		Ok      bool   `json:"ok"`
		Error   string `json:"error"`
		Messages []struct {
			Text string `json:"text"`
			Ts   string `json:"ts"`
			User string `json:"user"`
		} `json:"messages"`
		ResponseMetadata struct {
			NextCursor string `json:"next_cursor"`
		} `json:"response_metadata"`
	}

	if e := json.Unmarshal(body, &response); e != nil {
		return err(e.Error())
}

	if !response.Ok {
		return err(response.Error)
}

	var messages []string
	for _, msg := range response.Messages {
		messages = append(messages, fmt.Sprintf("%s: %s (ts: %s)", msg.User, msg.Text, msg.Ts))

	if response.ResponseMetadata.NextCursor != "" {
		messages = append(messages, fmt.Sprintf("Next cursor: %s", response.ResponseMetadata.NextCursor))

	return ok(strings.Join(messages, "\n"))
}

}
}
}
}
}

func HandleConversationsReplies(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	channelID, _ :=getString(args, "channel_id")
	if channelID == "" {
		return err("channel_id is required")
}

	threadTs, _ :=getString(args, "thread_ts")
	if threadTs == "" {
		return err("thread_ts is required")
}

	includeActivity, _ :=getBool(args, "include_activity_messages")
	cursor, _ :=getString(args, "cursor")
	limit, _ :=getString(args, "limit")

	params := url.Values{
		"channel": channelID,
		"ts":      threadTs,
	}
	if includeActivity {
		params.Set("include_activity_messages", "true")

	if cursor != "" {
		params.Set("cursor", cursor)

	if limit != "" {
		params.Set("limit", limit)

	body, e := slackAPIRequest(ctx, "POST", "/conversations.replies", params)
	if e != nil {
		return err(e.Error())
}

	var response struct {
		Ok      bool   `json:"ok"`
		Error   string `json:"error"`
		Messages []struct {
			Text string `json:"text"`
			Ts   string `json:"ts"`
			User string `json:"user"`
		} `json:"messages"`
		ResponseMetadata struct {
			NextCursor string `json:"next_cursor"`
		} `json:"response_metadata"`
	}

	if e := json.Unmarshal(body, &response); e != nil {
		return err(e.Error())
}

	if !response.Ok {
		return err(response.Error)
}

	var messages []string
	for _, msg := range response.Messages {
		messages = append(messages, fmt.Sprintf("%s: %s (ts: %s)", msg.User, msg.Text, msg.Ts))

	if response.ResponseMetadata.NextCursor != "" {
		messages = append(messages, fmt.Sprintf("Next cursor: %s", response.ResponseMetadata.NextCursor))

	return ok(strings.Join(messages, "\n"))
}

}
}
}
}
}

func HandleConversationsSearchMessages(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	searchQuery, _ :=getString(args, "search_query")
	filterInChannel, _ :=getString(args, "filter_in_channel")
	filterInIM, _ :=getString(args, "filter_in_im_or_mpim")
	filterUsersWith, _ :=getString(args, "filter_users_with")
	filterUsersFrom, _ :=getString(args, "filter_users_from")
	filterDateBefore, _ :=getString(args, "filter_date_before")
	filterDateAfter, _ :=getString(args, "filter_date_after")

	if searchQuery == "" && filterInChannel == "" && filterInIM == "" && filterUsersWith == "" && filterUsersFrom == "" && filterDateBefore == "" && filterDateAfter == "" {
		return err("at least one filter parameter is required")
}

	params := url.Values{
		"query": searchQuery,
	}
	if filterInChannel != "" {
		params.Set("filter_in_channel", filterInChannel)

	if filterInIM != "" {
		params.Set("filter_in_im_or_mpim", filterInIM)

	if filterUsersWith != "" {
		params.Set("filter_users_with", filterUsersWith)

	if filterUsersFrom != "" {
		params.Set("filter_users_from", filterUsersFrom)

	if filterDateBefore != "" {
		params.Set("filter_date_before", filterDateBefore)

	if filterDateAfter != "" {
		params.Set("filter_date_after", filterDateAfter)

	body, e := slackAPIRequest(ctx, "GET", "/search.messages", params)
	if e != nil {
		return err(e.Error())
}

	var response struct {
		Ok    bool   `json:"ok"`
		Error string `json:"error"`
		Messages []struct {
			Text string `json:"text"`
			Ts   string `json:"ts"`
			User string `json:"user"`
		} `json:"messages"`
	}

	if e := json.Unmarshal(body, &response); e != nil {
		return err(e.Error())
}

	if !response.Ok {
		return err(response.Error)
}

	var messages []string
	for _, msg := range response.Messages {
		messages = append(messages, fmt.Sprintf("%s: %s (ts: %s)", msg.User, msg.Text, msg.Ts))

	return ok(strings.Join(messages, "\n"))
}
}
}
}
}
}
}
}