package httpapi

import (
	"encoding/json"
	"strings"
	"testing"
)

// Regression: the subscription credential only covers the Responses API.
// The shim must emit Responses input items (function_call_output, not the
// chat-completions "tool" role) and Responses function tools (flat shape).
func TestAnthropicToResponsesToolLoop(t *testing.T) {
	req := &anthropicMessagesRequest{
		Model:     "muse-spark-1.3-contributor",
		MaxTokens: 64,
		System:    "sys",
		Messages: []anthropicMessage{
			{Role: "user", Content: "hi"},
			{Role: "assistant", Content: []any{
				map[string]any{"type": "text", "text": "calling"},
				map[string]any{"type": "tool_use", "id": "toolu_1",
					"name": "get_weather", "input": map[string]any{"city": "Paris"}},
			}},
			{Role: "user", Content: []any{
				map[string]any{"type": "tool_result", "tool_use_id": "toolu_1", "content": "sunny"},
			}},
		},
		Tools: []anthropicTool{
			{Name: "get_weather", Description: "weather",
				InputSchema: map[string]any{"type": "object"}},
		},
	}
	items := anthropicToResponses(req)
	raw, _ := json.Marshal(items)
	s := string(raw)
	if !strings.Contains(s, `"type":"function_call_output"`) {
		t.Fatalf("tool_result must become function_call_output, got: %s", s)
	}
	if strings.Contains(s, `"role":"tool"`) {
		t.Fatalf("chat-completions tool role must not appear, got: %s", s)
	}
	if !strings.Contains(s, `"type":"function_call"`) {
		t.Fatalf("assistant tool_use must become function_call, got: %s", s)
	}
	if !strings.Contains(s, `"call_id":"toolu_1"`) {
		t.Fatalf("call_id pairing missing, got: %s", s)
	}
	tools := anthropicToolsToResponses(req.Tools)
	traw, _ := json.Marshal(tools)
	ts := string(traw)
	// Flat Responses function shape (key order is alphabetical from map marshal).
	if !strings.Contains(ts, `"type":"function"`) || !strings.Contains(ts, `"name":"get_weather"`) {
		t.Fatalf("tools must be flat Responses function shape, got: %s", ts)
	}
	if strings.Contains(ts, `"function":{"name"`) {
		t.Fatalf("chat-completions nested function shape must not appear, got: %s", ts)
	}
}

func TestAnthropicTextOf(t *testing.T) {
	if got := anthropicTextOf("hello"); got != "hello" {
		t.Fatalf("string passthrough: %q", got)
	}
	blocks := []any{map[string]any{"type": "text", "text": "a"}, map[string]any{"type": "image", "source": "x"}}
	if got := anthropicTextOf(blocks); got != "a" {
		t.Fatalf("block extraction: %q", got)
	}
}
