package httpapi

import (
	"encoding/json"
	"strings"
	"testing"
)

// Regression: the subscription credential only covers the Responses API
// (chat-completions is rejected with client_attestation_denied). The kernel
// must therefore translate OpenAI chat requests into Responses input items
// and translate the Responses output back into a chat.completion envelope.
func TestOpenAIChatToResponsesItems(t *testing.T) {
	msgs := []openAIChatMessage{
		{Role: "system", Content: "sys"},
		{Role: "user", Content: "hi"},
		{Role: "assistant", Content: "calling", ToolCalls: []openAIToolCall{
			{ID: "call_1", Type: "function", Function: struct {
				Name      string `json:"name"`
				Arguments string `json:"arguments"`
			}{Name: "get_weather", Arguments: `{"city":"Paris"}`}},
		}},
		{Role: "tool", ToolCallID: "call_1", Content: "sunny"},
	}
	items := openAIToResponsesInput(msgs)
	raw, _ := json.Marshal(items)
	s := string(raw)
	if !strings.Contains(s, `"role":"system"`) {
		t.Fatalf("system message missing, got: %s", s)
	}
	if !strings.Contains(s, `"type":"function_call_output"`) {
		t.Fatalf("tool message must become function_call_output, got: %s", s)
	}
	if strings.Contains(s, `"role":"tool"`) {
		t.Fatalf("chat-completions tool role must not appear, got: %s", s)
	}
	if !strings.Contains(s, `"type":"function_call"`) || !strings.Contains(s, `"call_id":"call_1"`) {
		t.Fatalf("assistant tool_calls must become function_call items, got: %s", s)
	}
}

func TestOpenAIToolsToResponses(t *testing.T) {
	tools := openAIToolsToResponses([]openAITool{{
		Type: "function",
		Function: struct {
			Name        string         `json:"name"`
			Description string         `json:"description"`
			Parameters  map[string]any `json:"parameters"`
		}{Name: "get_weather", Description: "weather", Parameters: map[string]any{"type": "object"}},
	}})
	raw, _ := json.Marshal(tools)
	s := string(raw)
	if !strings.Contains(s, `"type":"function"`) || !strings.Contains(s, `"name":"get_weather"`) {
		t.Fatalf("tools must be flat Responses function shape, got: %s", s)
	}
	if strings.Contains(s, `"function":{"name"`) {
		t.Fatalf("chat-completions nested function shape must not appear, got: %s", s)
	}
}

func TestOpenAIToolChoiceToResponses(t *testing.T) {
	if got := openAIToolChoiceToResponses("none"); got != "none" {
		t.Fatalf("string passthrough: %v", got)
	}
	if got := openAIToolChoiceToResponses(nil); got != nil {
		t.Fatalf("nil passthrough: %v", got)
	}
	got := openAIToolChoiceToResponses(map[string]any{
		"type": "function", "function": map[string]any{"name": "get_weather"},
	})
	m, ok := got.(map[string]any)
	if !ok || m["type"] != "function" || m["name"] != "get_weather" {
		t.Fatalf("named choice mapping: %v", got)
	}
}

func TestOpenAIResponsesToChat(t *testing.T) {
	output := []responsesOutputItem{
		{Type: "message", Content: []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		}{{Type: "output_text", Text: "sunny"}}},
		{Type: "function_call", CallID: "call_1", Name: "get_weather", Arguments: `{"city":"Paris"}`},
		{Type: "reasoning"}, // not representable; must not break translation
	}
	env, finish := responsesToOpenAIChat("muse-spark-1.3-contributor", output, "completed", 10, 5, "chatcmpl_hn_test")
	raw, _ := json.Marshal(env)
	s := string(raw)
	if !strings.Contains(s, `"content":"sunny"`) {
		t.Fatalf("assistant content missing, got: %s", s)
	}
	if !strings.Contains(s, `"id":"call_1"`) || !strings.Contains(s, `"name":"get_weather"`) {
		t.Fatalf("tool_calls missing, got: %s", s)
	}
	if finish != "tool_calls" {
		t.Fatalf("finish must be tool_calls, got %q (%s)", finish, s)
	}
	if !strings.Contains(s, `"prompt_tokens":10`) || !strings.Contains(s, `"completion_tokens":5`) || !strings.Contains(s, `"total_tokens":15`) {
		t.Fatalf("usage mapping wrong, got: %s", s)
	}
	if !strings.Contains(s, `"object":"chat.completion"`) {
		t.Fatalf("envelope object wrong, got: %s", s)
	}
}
