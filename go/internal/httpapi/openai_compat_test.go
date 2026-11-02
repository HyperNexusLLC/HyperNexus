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
	// Vendor change 2026-11-02: named function choices 400 ("only 'auto'
	// is supported"), so every object choice maps onto "auto".
	if got != "auto" {
		t.Fatalf("named choice must map to auto, got: %v", got)
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

// The vendor attests subscription keys against a denylist of tool names
// (live bisection 2026-11-02: bash/powershell/shell/request_user_input/
// get_goal/create_goal/update_goal/web_search/web_fetch/search → 403
// client_attestation_denied; execute_command/fetch/search_memory/namespace/
// view_image/parity tools → 200).
func TestAttestationTrippingTool(t *testing.T) {
	for _, n := range []string{"bash", "Bash", "powershell", "PowerShell", "shell", "SHELL",
		"request_user_input", "get_goal", "create_goal", "update_goal",
		"web_search", "Web_Search", "web_fetch", "search"} {
		if !attestationTrippingTool(n) {
			t.Fatalf("%q must trip attestation", n)
		}
	}
	// Locked bisection results: these passed live and must NOT be stripped.
	for _, n := range []string{"execute_command", "hypernexus_read", "read", "grep", "memory_search", "", "mcp_call_tool", "fetch", "search_memory", "view_image", "multi_agent_v1", "run_command", "browser_search"} {
		if attestationTrippingTool(n) {
			t.Fatalf("%q must not trip attestation", n)
		}
	}
}

func TestStripAttestationTools(t *testing.T) {
	in := []any{
		map[string]any{"type": "function", "name": "bash"},
		map[string]any{"type": "function", "name": "hypernexus_read"},
		map[string]any{"type": "function", "name": "Shell"},
		"not-a-map",
	}
	in = append(in, map[string]any{"type": "function", "name": "request_user_input"})
	in = append(in, map[string]any{"type": "function", "name": "web_search"})
	kept, names := stripAttestationTools(in)
	if len(names) != 4 {
		t.Fatalf("stripped = %v, want 4 names", names)
	}
	if len(kept) != 2 {
		t.Fatalf("kept = %d, want 2", len(kept))
	}
	raw, _ := json.Marshal(kept)
	s := string(raw)
	if strings.Contains(s, `"bash"`) || strings.Contains(s, `"Shell"`) || strings.Contains(s, `"web_search"`) {
		t.Fatalf("tripping tools must be gone, got: %s", s)
	}
	if !strings.Contains(s, `"hypernexus_read"`) {
		t.Fatalf("parity tool must be kept, got: %s", s)
	}
	// Nothing to strip → same list, zero names (no pointless retry).
	if kept2, names := stripAttestationTools([]any{map[string]any{"type": "function", "name": "read"}}); len(names) != 0 || len(kept2) != 1 {
		t.Fatalf("clean list must pass through, got kept=%d stripped=%v", len(kept2), names)
	}
}

func TestIsRecursiveSchemaDenial(t *testing.T) {
	if !needsToolRetry(400, []byte(`{"error":{"code":null,"message":"Recursive JSON schemas are not currently supported"}}`)) {
		t.Fatal("400 recursive-schema must trigger retry")
	}
	if !needsToolRetry(403, []byte(`{"code":"client_attestation_denied"}`)) {
		t.Fatal("403 attestation must trigger retry")
	}
	if needsToolRetry(200, []byte(`{}`)) {
		t.Fatal("200 must not trigger retry")
	}
}

func TestRetryBodyForDenied(t *testing.T) {
	mkTools := func(names ...string) []any {
		var out []any
		for _, n := range names {
			out = append(out, map[string]any{"type": "function", "name": n})
		}
		return out
	}
	denied403 := []byte(`{"error":{"code":"client_attestation_denied"}}`)
	// 403 with a shell tool → stripped copy, original untouched.
	body := map[string]any{"model": "m", "tools": mkTools("bash", "read")}
	retry := retryBodyForDenied(body, mkTools("bash", "read"), 403, denied403)
	if retry == nil {
		t.Fatal("403 with bash must retry")
	}
	if _, ok := retry["tools"]; !ok {
		t.Fatal("retry must carry tools")
	}
	raw, _ := json.Marshal(retry)
	if strings.Contains(string(raw), `"bash"`) {
		t.Fatalf("bash must be stripped, got: %s", raw)
	}
	if len(body["tools"].([]any)) != 2 {
		t.Fatal("original body must not be mutated")
	}
	// 403 with nothing to strip → nil (no blind retry).
	if r := retryBodyForDenied(map[string]any{"model": "m"}, mkTools("read"), 403, denied403); r != nil {
		t.Fatal("403 with clean tools must surface")
	}
	// 400 recursive with nothing known-bad → identical body once.
	rec400 := []byte(`{"error":{"message":"Recursive JSON schemas are not currently supported"}}`)
	clean := map[string]any{"model": "m", "tools": mkTools("read")}
	if r := retryBodyForDenied(clean, mkTools("read"), 400, rec400); r == nil {
		t.Fatal("400 recursive with clean tools must retry identical once")
	}
	// 200 → nil.
	if r := retryBodyForDenied(clean, mkTools("read"), 200, []byte(`{}`)); r != nil {
		t.Fatal("200 must not retry")
	}
}

func TestSchemaHasRef(t *testing.T) {
	if !schemaHasRef(map[string]any{"type": "object", "properties": map[string]any{"x": map[string]any{"$ref": "#/defs/y"}}}) {
		t.Fatal("nested $ref must be detected")
	}
	if !schemaHasRef(map[string]any{"$recursiveRef": "#"}) {
		t.Fatal("top-level $recursiveRef must be detected")
	}
	if !schemaHasRef([]any{map[string]any{"type": "string"}, map[string]any{"$dynamicRef": "#d"}}) {
		t.Fatal("$dynamicRef inside array must be detected")
	}
	for _, clean := range []any{
		nil,
		"plain",
		map[string]any{"type": "object", "properties": map[string]any{"x": map[string]any{"type": "string"}}},
		map[string]any{"type": "object"},
	} {
		if schemaHasRef(clean) {
			t.Fatalf("clean schema must not trip: %v", clean)
		}
	}
}

func TestStripRecursiveSchemaTools(t *testing.T) {
	refTool := func(name string) map[string]any {
		return map[string]any{"type": "function", "name": name,
			"parameters": map[string]any{"type": "object", "properties": map[string]any{"m": map[string]any{"$ref": "#/d"}}}}
	}
	cleanTool := func(name string) map[string]any {
		return map[string]any{"type": "function", "name": name,
			"parameters": map[string]any{"type": "object"}}
	}
	in := []any{
		refTool("gmail_send"),
		cleanTool("get_status"),
		map[string]any{"type": "function", "name": "mcp__gmail", "tools": []any{refTool("_send"), cleanTool("_list")}},
		map[string]any{"type": "function", "name": "mcp__empty", "tools": []any{refTool("_only")}},
		"not-a-map",
	}
	kept, names := stripRecursiveSchemaTools(in)
	if len(names) != 3 {
		t.Fatalf("stripped = %v, want 3 names", names)
	}
	raw, _ := json.Marshal(kept)
	s := string(raw)
	for _, gone := range []string{`"gmail_send"`, `"_send"`, `"mcp__empty"`} {
		if strings.Contains(s, gone) {
			t.Fatalf("recursive tool must be gone: %s in %s", gone, s)
		}
	}
	for _, want := range []string{`"get_status"`, `"_list"`, `"mcp__gmail"`, `"not-a-map"`} {
		if !strings.Contains(s, want) {
			t.Fatalf("kept tool missing: %s in %s", want, s)
		}
	}
	if kept2, names := stripRecursiveSchemaTools([]any{cleanTool("read")}); len(names) != 0 || len(kept2) != 1 {
		t.Fatalf("clean list must pass through, got kept=%d stripped=%v", len(kept2), names)
	}
}

func TestRetryBodyRecursiveStrip(t *testing.T) {
	rec400 := []byte(`{"error":{"message":"Recursive JSON schemas are not currently supported"}}`)
	mkEnv := func(subs ...any) map[string]any {
		return map[string]any{"type": "function", "name": "mcp__gmail", "tools": subs}
	}
	refSub := map[string]any{"name": "_send", "parameters": map[string]any{"$ref": "#/d"}}
	okSub := map[string]any{"name": "_list", "parameters": map[string]any{"type": "object"}}
	body := map[string]any{"model": "m", "tools": []any{mkEnv(refSub, okSub)}}
	retry := retryBodyForDenied(body, []any{mkEnv(refSub, okSub)}, 400, rec400)
	if retry == nil {
		t.Fatal("400 recursive with $ref tools must retry stripped, not nil")
	}
	raw, _ := json.Marshal(retry)
	if strings.Contains(string(raw), `"_send"`) {
		t.Fatalf("$ref sub-tool must be stripped, got: %s", raw)
	}
	if !strings.Contains(string(raw), `"_list"`) {
		t.Fatalf("clean sub-tool must survive, got: %s", raw)
	}
}

func TestStripAttestationEnvelopeSubs(t *testing.T) {
	mkEnv := func(name string, subs ...any) map[string]any {
		return map[string]any{"type": "function", "name": name, "tools": subs}
	}
	mkSub := func(name string) map[string]any {
		return map[string]any{"name": name, "parameters": map[string]any{"type": "object"}}
	}
	in := []any{
		mkEnv("mcp__hypernexus", mkSub("bash"), mkSub("read")),
		mkEnv("mcp__shell_only", mkSub("powershell")),
	}
	kept, names := stripAttestationTools(in)
	if len(names) != 2 {
		t.Fatalf("stripped = %v, want [mcp__hypernexus::bash mcp__shell_only(emptied)]", names)
	}
	raw, _ := json.Marshal(kept)
	s := string(raw)
	for _, gone := range []string{`"bash"`, `"powershell"`, `"mcp__shell_only"`} {
		if strings.Contains(s, gone) {
			t.Fatalf("tripping tool must be gone: %s in %s", gone, s)
		}
	}
	if !strings.Contains(s, `"read"`) || !strings.Contains(s, `"mcp__hypernexus"`) {
		t.Fatalf("clean sub-tool and envelope must survive: %s", s)
	}
}

func TestStripDeniedToolsCombined(t *testing.T) {
	refSub := map[string]any{"name": "_send", "parameters": map[string]any{"$ref": "#/d"}}
	okSub := map[string]any{"name": "_list", "parameters": map[string]any{"type": "object"}}
	in := []any{
		map[string]any{"type": "function", "name": "bash"},
		map[string]any{"type": "function", "name": "mcp__mix", "tools": []any{refSub, okSub}},
		map[string]any{"type": "function", "name": "read"},
	}
	kept, names := stripDeniedTools(in)
	if len(names) != 2 {
		t.Fatalf("stripped = %v, want [bash mcp__mix::_send]", names)
	}
	raw, _ := json.Marshal(kept)
	s := string(raw)
	if strings.Contains(s, `"bash"`) || strings.Contains(s, `"_send"`) {
		t.Fatalf("denied tools must be gone: %s", s)
	}
	if !strings.Contains(s, `"_list"`) || !strings.Contains(s, `"read"`) {
		t.Fatalf("clean tools must survive: %s", s)
	}
}

func TestResetDanglingToolChoice(t *testing.T) {
	body := map[string]any{"tool_choice": map[string]any{"type": "function", "function": map[string]any{"name": "bash"}}}
	resetDanglingToolChoice(body)
	if body["tool_choice"] != "auto" {
		t.Fatalf("dangling bash choice must reset to auto, got: %v", body["tool_choice"])
	}
	body = map[string]any{"tool_choice": "auto"}
	resetDanglingToolChoice(body)
	if body["tool_choice"] != "auto" {
		t.Fatalf("string choice must be untouched, got: %v", body["tool_choice"])
	}
}

// First attempt must stay unfiltered so PAYG keys keep working with shell
// tools; the strip only happens on retry after a 403 denial.
func TestOpenAIToolsKeepShellFirstAttempt(t *testing.T) {
	tools := openAIToolsToResponses([]openAITool{{
		Type: "function",
		Function: struct {
			Name        string         `json:"name"`
			Description string         `json:"description"`
			Parameters  map[string]any `json:"parameters"`
		}{Name: "bash", Description: "run shell", Parameters: map[string]any{"type": "object"}},
	}})
	if len(tools) != 1 {
		t.Fatalf("first-attempt tools must not be pre-stripped, got %d", len(tools))
	}
}

func TestNormalizeMetaModel(t *testing.T) {
	if got := normalizeMetaModel("meta/muse-spark-1.3-contributor"); got != "muse-spark-1.3-contributor" {
		t.Fatalf("prefix not stripped, got %q", got)
	}
	if got := normalizeMetaModel("muse-spark-1.3-contributor"); got != "muse-spark-1.3-contributor" {
		t.Fatalf("bare model must be untouched, got %q", got)
	}
	if got := normalizeMetaModel(""); got != "" {
		t.Fatalf("empty model must stay empty, got %q", got)
	}
}

func TestIsAttestationDenial(t *testing.T) {
	if !isAttestationDenial(403, []byte(`{"code":"client_attestation_denied"}`)) {
		t.Fatal("403 + attestation code must match")
	}
	if isAttestationDenial(401, []byte(`{"code":"client_attestation_denied"}`)) {
		t.Fatal("401 must not match")
	}
	if isAttestationDenial(403, []byte(`{"code":"other"}`)) {
		t.Fatal("other 403 must not match")
	}
}
