package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/MDMAtk/TormentNexus/internal/config"
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

// Regression: Meta subscription attestation denies exact bare tool names
// (bash/powershell/shell/add_memory — verified live 2026-10-31, 55 names;
// extended 2026-11-02 by the fleet bisection: goal/input/search names too,
// case-insensitive). The shim renames them on the way out and maps them back
// on the way in.
func TestMetaDeniedToolRenameRoundTrip(t *testing.T) {
	if got := metaSafeName("bash"); got != "hypernexus_bash" {
		t.Fatalf("bash must rename, got %q", got)
	}
	if got := metaSafeName("add_memory"); got != "hypernexus_add_memory" {
		t.Fatalf("add_memory must rename, got %q", got)
	}
	for _, tc := range []struct{ in, want string }{
		{"web_search", "hypernexus_web_search"},
		{"web_fetch", "hypernexus_web_fetch"},
		{"search", "hypernexus_search"},
		{"request_user_input", "hypernexus_request_user_input"},
		{"get_goal", "hypernexus_get_goal"},
		{"create_goal", "hypernexus_create_goal"},
		{"update_goal", "hypernexus_update_goal"},
		{"Bash", "hypernexus_bash"},     // case-insensitive, matches openai_compat.go
		{"Web_Search", "hypernexus_web_search"},
	} {
		if got := metaSafeName(tc.in); got != tc.want {
			t.Fatalf("metaSafeName(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
	// Untouched: everything else passes through, incl. namespaced variants.
	for _, n := range []string{"read", "mcp__hypernexus__bash", "mcp__hypernexus__add_memory", "run_shell_command", "execute_command", "fetch"} {
		if got := metaSafeName(n); got != n {
			t.Fatalf("name %q must pass through, got %q", n, got)
		}
	}
	if got := metaRealName("hypernexus_bash"); got != "bash" {
		t.Fatalf("reverse map broken, got %q", got)
	}
	if got := metaRealName("hypernexus_web_search"); got != "web_search" {
		t.Fatalf("reverse map broken for web_search, got %q", got)
	}

	// Declaration path: bare bash declared -> renamed in Responses tools.
	req := &anthropicMessagesRequest{
		Model:     "muse-spark-1.3-contributor",
		MaxTokens: 64,
		Tools: []anthropicTool{{Name: "bash", Description: "Execute a shell command",
			InputSchema: map[string]any{"type": "object"}}},
		Messages: []anthropicMessage{{Role: "user", Content: "hi"}},
	}
	tools := anthropicToolsToResponses(req.Tools)
	raw, _ := json.Marshal(tools)
	if s := string(raw); !strings.Contains(s, `"name":"hypernexus_bash"`) {
		t.Fatalf("declaration must rename bash, got: %s", s)
	}

	// History replay path: tool_use bash -> function_call hypernexus_bash.
	req2 := &anthropicMessagesRequest{
		Model:     "muse-spark-1.3-contributor",
		MaxTokens: 64,
		Messages: []anthropicMessage{
			{Role: "user", Content: "hi"},
			{Role: "assistant", Content: []any{
				map[string]any{"type": "tool_use", "id": "toolu_1", "name": "bash", "input": map[string]any{}},
			}},
			{Role: "user", Content: []any{
				map[string]any{"type": "tool_result", "tool_use_id": "toolu_1", "content": "hi"},
			}},
		},
	}
	items := anthropicToResponses(req2)
	raw2, _ := json.Marshal(items)
	if s := string(raw2); !strings.Contains(s, `"name":"hypernexus_bash"`) || strings.Contains(s, `"name":"bash"`) {
		t.Fatalf("history replay must rename bash, got: %s", s)
	}
}

// Regression: /v1/models must advertise the meta/-prefixed aliases.
// Fleet configs pin model = "meta/muse-spark-1.3-contributor" (the kernel
// strips the prefix upstream); codex 0.166 resolves picker entries and model
// metadata by exact ID match, warning "model metadata not found" and hiding
// the model when only bare IDs are listed.
func TestAnthropicModelsAdvertisesPrefixedAliases(t *testing.T) {
	server := New(config.Default(), stubDetector{})
	rec := httptest.NewRecorder()
	server.handleAnthropicModels(rec, httptest.NewRequest(http.MethodGet, "/v1/models", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("models expected 200, got %d", rec.Code)
	}
	var body struct {
		Data []map[string]any `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("models body must be JSON: %v", err)
	}
	ids := map[string]bool{}
	for _, m := range body.Data {
		if id, ok := m["id"].(string); ok {
			ids[id] = true
		}
	}
	for _, want := range []string{"muse-spark-1.3-contributor", "meta/muse-spark-1.3-contributor"} {
		if !ids[want] {
			t.Fatalf("models list must contain %q, got %v", want, ids)
		}
	}
}
