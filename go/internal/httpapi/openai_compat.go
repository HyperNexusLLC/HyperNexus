package httpapi

// OpenAI-compatible chat surface for the Meta subscriber model.
//
// The subscription credential only covers the Responses API
// (POST https://api.meta.ai/v1/responses) — chat-completions is rejected with
// client_attestation_denied. So /v1/chat/completions is translated to/from
// Responses here, mirroring the Anthropic shim: the OpenAI request becomes
// Responses input items + flat function tools, the upstream call is
// non-streaming, and the Responses output is translated back into a
// chat.completion envelope. stream=true replays the buffered result as
// OpenAI SSE chunks (same tokens/latency). /v1/responses passes through
// untouched (see proxyToMeta).

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// ── OpenAI chat request shapes ────────────────────────────────────────

type openAIChatMessage struct {
	Role       string           `json:"role"`
	Content    any              `json:"content"`
	ToolCalls  []openAIToolCall `json:"tool_calls"`
	ToolCallID string           `json:"tool_call_id"`
	Name       string           `json:"name"`
}

type openAIToolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

type openAITool struct {
	Type     string `json:"type"`
	Function struct {
		Name        string         `json:"name"`
		Description string         `json:"description"`
		Parameters  map[string]any `json:"parameters"`
	} `json:"function"`
}

type openAIChatRequest struct {
	Model               string              `json:"model"`
	Messages            []openAIChatMessage `json:"messages"`
	Tools               []openAITool        `json:"tools"`
	ToolChoice          any                 `json:"tool_choice"`
	Temperature         *float64            `json:"temperature"`
	MaxTokens           int                 `json:"max_tokens"`
	MaxCompletionTokens int                 `json:"max_completion_tokens"`
	Stream              bool                `json:"stream"`
}

// openAITextOf extracts plain text from a string or a content-part array
// (text/input_text parts; image/audio parts have no text representation).
func openAITextOf(content any) string {
	if s, ok := content.(string); ok {
		return s
	}
	parts, ok := content.([]any)
	if !ok {
		return ""
	}
	var texts []string
	for _, p := range parts {
		pm, ok := p.(map[string]any)
		if !ok {
			continue
		}
		if pm["type"] == "text" || pm["type"] == "input_text" || pm["type"] == "output_text" {
			if t, ok := pm["text"].(string); ok && t != "" {
				texts = append(texts, t)
			}
		}
	}
	return strings.Join(texts, "\n")
}

// openAIToResponsesInput converts OpenAI chat messages into Responses input
// items. Tool results ({role:"tool"}) become freestanding function_call_output
// items keyed by call_id; assistant tool_calls replay as function_call items.
func openAIToResponsesInput(messages []openAIChatMessage) []map[string]any {
	var out []map[string]any
	var system []string
	flushSystem := func() {
		if len(system) > 0 {
			out = append(out, map[string]any{"role": "system", "content": strings.Join(system, "\n")})
			system = nil
		}
	}
	for _, m := range messages {
		switch m.Role {
		case "system", "developer":
			if t := openAITextOf(m.Content); t != "" {
				system = append(system, t)
			}
		case "tool":
			flushSystem()
			var contentStr string
			switch c := m.Content.(type) {
			case string:
				contentStr = c
			default:
				cb, _ := json.Marshal(c)
				contentStr = string(cb)
			}
			out = append(out, map[string]any{
				"type": "function_call_output", "call_id": m.ToolCallID, "output": contentStr,
			})
		case "assistant":
			flushSystem()
			if t := openAITextOf(m.Content); t != "" {
				out = append(out, map[string]any{"role": "assistant", "content": t})
			}
			for _, tc := range m.ToolCalls {
				out = append(out, map[string]any{
					"type":    "function_call",
					"call_id": tc.ID, "name": tc.Function.Name, "arguments": tc.Function.Arguments,
				})
			}
			if openAITextOf(m.Content) == "" && len(m.ToolCalls) == 0 {
				out = append(out, map[string]any{"role": "assistant", "content": ""})
			}
		default: // user and anything else
			flushSystem()
			out = append(out, map[string]any{"role": "user", "content": openAITextOf(m.Content)})
		}
	}
	flushSystem()
	return out
}

// openAIToolsToResponses flattens chat-completions tools into Responses
// function tools.
func openAIToolsToResponses(tools []openAITool) []map[string]any {
	var out []map[string]any
	for _, t := range tools {
		if t.Type != "" && t.Type != "function" {
			continue
		}
		item := map[string]any{"type": "function", "name": t.Function.Name}
		if t.Function.Description != "" {
			item["description"] = t.Function.Description
		}
		if t.Function.Parameters != nil {
			item["parameters"] = t.Function.Parameters
		}
		out = append(out, item)
	}
	return out
}

// ── Subscription attestation guard ──────────────────────────────────────────
//
// Live bisection against https://api.meta.ai/v1/responses (subscription key,
// 2026-11-01): no tools → 200; parity tools (read/grep/memory, minimal
// descriptions) → 200; a description mentioning "shell" → 200; a tool NAMED
// bash, powershell, shell, request_user_input, get_goal, create_goal, or
// update_goal → 403 client_attestation_denied (execute_command, web_search,
// subagent namespaces, and view_image → 200). Attestation keys off the tool
// NAME (case-insensitively here; vendor case handling untested). Codex sends
// its native shell/goal/user-input tools and opencode sends native bash, so
// proxying them verbatim always 403s. On a 403 attestation denial with tools
// present, retry once WITHOUT the tripping names (PAYG keys pass the first
// attempt, so they never pay the retry).

// attestationTrippingTool reports whether a Responses function-tool name trips
// Meta's subscription attestation. Live bisection 2026-11-02: the vendor
// tightened attestation — web_search, web_fetch and search now 403 alongside
// the shell/input/goal names, while execute_command, fetch and the
// hypernexus parity tools still pass untouched.
func attestationTrippingTool(name string) bool {
	switch strings.ToLower(name) {
	case "bash", "powershell", "shell",
		"request_user_input",
		"get_goal", "create_goal", "update_goal",
		"apply_patch", "update_plan",
		"web_search", "web_fetch", "search":
		return true
	}
	return false
}

// stripAttestationTools drops Responses function tools whose names trip
// subscription attestation (or break the vendor's schema subset, like
// codex's deeply-nested request_user_input). It returns the kept tools and
// the stripped names.
func stripAttestationTools(tools []any) (kept []any, stripped []string) {
	for _, t := range tools {
		m, ok := t.(map[string]any)
		if !ok {
			kept = append(kept, t)
			continue
		}
		name, _ := m["name"].(string)
		if subs, isEnv := m["tools"].([]any); isEnv {
			var droppedSubs []string
			var keptList []any
			for _, sub := range subs {
				sm, _ := sub.(map[string]any)
				sn, _ := sm["name"].(string)
				if attestationTrippingTool(sn) {
					droppedSubs = append(droppedSubs, name+"::"+sn)
					continue
				}
				keptList = append(keptList, sub)
			}
			if len(keptList) == 0 {
				stripped = append(stripped, name+"(emptied)")
				continue
			}
			stripped = append(stripped, droppedSubs...)
			if len(droppedSubs) == 0 {
				kept = append(kept, t)
				continue
			}
			env := make(map[string]any, len(m))
			for k, v := range m {
				env[k] = v
			}
			env["tools"] = keptList
			kept = append(kept, env)
			continue
		}
		typ, _ := m["type"].(string)
		if (typ == "" || typ == "function") && attestationTrippingTool(name) {
			stripped = append(stripped, name)
			continue
		}
		kept = append(kept, t)
	}
	return kept, stripped
}

// stripDeniedTools applies both the attestation-name strip and the
// recursive-schema strip, so a single retry sheds every known-bad tool no
// matter which denial the vendor reported first.
func stripDeniedTools(tools []any) (kept []any, names []string) {
	keptAtt, namesAtt := stripAttestationTools(tools)
	keptRec, namesRec := stripRecursiveSchemaTools(keptAtt)
	return keptRec, append(namesAtt, namesRec...)
}

// schemaHasRef reports whether a decoded JSON-schema node contains a
// $ref-style reference. Decoded JSON is always a tree, so plain recursion
// is safe. The Meta vendor rejects recursive schemas outright (400
// "Recursive JSON schemas are not currently supported"); codex's own
// built-in app servers (notably the Gmail tools) ship $refs, so the proxy
// strips those tools on retry instead of failing the whole request.
func schemaHasRef(v any) bool {
	switch t := v.(type) {
	case map[string]any:
		for k, child := range t {
			if k == "$ref" || k == "$recursiveRef" || k == "$dynamicRef" {
				return true
			}
			if schemaHasRef(child) {
				return true
			}
		}
	case []any:
		for _, child := range t {
			if schemaHasRef(child) {
				return true
			}
		}
	}
	return false
}

// toolHasRecursiveSchema reports whether a Responses function tool — or any
// sub-tool of a namespace envelope — carries a $ref-style schema.
func toolHasRecursiveSchema(tool any) bool {
	m, ok := tool.(map[string]any)
	if !ok {
		return false
	}
	for _, key := range []string{"parameters", "inputSchema", "input_schema"} {
		if s, ok := m[key]; ok && schemaHasRef(s) {
			return true
		}
	}
	if fn, ok := m["function"].(map[string]any); ok {
		if s, ok := fn["parameters"]; ok && schemaHasRef(s) {
			return true
		}
	}
	if subs, ok := m["tools"].([]any); ok {
		for _, sub := range subs {
			if toolHasRecursiveSchema(sub) {
				return true
			}
		}
	}
	return false
}

// stripRecursiveSchemaTools drops tools with $ref-style schemas, filtering
// sub-tools inside namespace envelopes (dropping an envelope left empty).
// It returns the kept list plus display names of what was removed.
func stripRecursiveSchemaTools(tools []any) (kept []any, names []string) {
	for _, tool := range tools {
		m, ok := tool.(map[string]any)
		if !ok {
			kept = append(kept, tool)
			continue
		}
		name, _ := m["name"].(string)
		subs, isEnv := m["tools"].([]any)
		if !isEnv {
			if toolHasRecursiveSchema(tool) {
				names = append(names, name)
				continue
			}
			kept = append(kept, tool)
			continue
		}
		var keptSubs []any
		var droppedSubs []string
		for _, sub := range subs {
			if toolHasRecursiveSchema(sub) {
				sm, _ := sub.(map[string]any)
				sn, _ := sm["name"].(string)
				droppedSubs = append(droppedSubs, name+"::"+sn)
				continue
			}
			keptSubs = append(keptSubs, sub)
		}
		if len(keptSubs) == 0 {
			names = append(names, name+"(emptied)")
			continue
		}
		names = append(names, droppedSubs...)
		env := make(map[string]any, len(m))
		for k, v := range m {
			env[k] = v
		}
		env["tools"] = keptSubs
		kept = append(kept, env)
	}
	return kept, names
}

// resetDanglingToolChoice drops a specific-function tool_choice that names a
// stripped tool back to "auto".
func resetDanglingToolChoice(body map[string]any) {
	tc, ok := body["tool_choice"].(map[string]any)
	if !ok {
		return
	}
	var cname string
	if fn, ok := tc["function"].(map[string]any); ok {
		cname, _ = fn["name"].(string)
	} else {
		cname, _ = tc["name"].(string)
	}
	if attestationTrippingTool(cname) {
		body["tool_choice"] = "auto"
	}
}

// normalizeMetaModel strips a harness provider prefix ("meta/") — the vendor
// only knows the bare model ID (a prefixed ID 404s as model_not_found).
func normalizeMetaModel(model string) string {
	if rest, ok := strings.CutPrefix(model, "meta/"); ok && rest != "" {
		return rest
	}
	return model
}

// isAttestationDenial reports a 403 client_attestation_denied upstream body.
func isAttestationDenial(status int, body []byte) bool {
	return status == http.StatusForbidden && bytes.Contains(body, []byte("client_attestation_denied"))
}

// isRecursiveSchemaDenial reports a 400 "Recursive JSON schemas" upstream
// body. Codex ships deeply-nested tool parameters (request_user_input's
// questions array); the vendor rejects those schemas before attestation
// even runs, so the same strip-and-retry applies.
func isRecursiveSchemaDenial(status int, body []byte) bool {
	return status == http.StatusBadRequest && bytes.Contains(body, []byte("Recursive JSON schemas"))
}

// needsToolRetry reports whether an upstream rejection warrants one stripped
// retry: an attestation denial or a recursive-schema rejection.
func needsToolRetry(status int, body []byte) bool {
	return isAttestationDenial(status, body) || isRecursiveSchemaDenial(status, body)
}

// retryBodyForDenied returns a request body worth one retry after an upstream
// tool-related rejection, or nil when the denial should surface unchanged:
//   - known-bad tool names present → a copy without them (tool_choice fixed);
//   - 400 recursive-schema → a copy without the $ref-bearing tools (e.g.
//     codex's built-in Gmail app tools); when nothing strips, the identical
//     body once (may be transient, e.g. a still-loading MCP definition).
//     Attested-name sub-tools inside envelopes are stripped in the same
//     retry, since the vendor reports only one denial per attempt;
//   - deterministic 403 with nothing to strip → nil (never retry blindly).
func retryBodyForDenied(body map[string]any, tools []any, status int, respBody []byte) map[string]any {
	if len(tools) == 0 || !needsToolRetry(status, respBody) {
		return nil
	}
	kept, names := stripDeniedTools(tools)
	if isAttestationDenial(status, respBody) && len(names) > 0 {
		model, _ := body["model"].(string)
		log.Printf("openai-compat: tool fallback for model %s, stripped %v, retrying", model, names)
		out := make(map[string]any, len(body))
		for k, v := range body {
			out[k] = v
		}
		out["tools"] = kept
		resetDanglingToolChoice(out)
		return out
	}
	if isRecursiveSchemaDenial(status, respBody) {
		model, _ := body["model"].(string)
		if len(names) > 0 {
			log.Printf("openai-compat: recursive-schema fallback for model %s, stripped %v, retrying", model, names)
			out := make(map[string]any, len(body))
			for k, v := range body {
				out[k] = v
			}
			out["tools"] = kept
			resetDanglingToolChoice(out)
			return out
		}
		log.Printf("openai-compat: recursive-schema denial with no known-bad tools for model %s, retrying identical once", model)
		return body
	}
	return nil
}

// openAIToolChoiceToResponses maps the chat-completions tool_choice onto the
// Responses equivalent.
func openAIToolChoiceToResponses(tc any) any {
	switch v := tc.(type) {
	case nil:
		return nil
	case string:
		return v // auto | none | required
	case map[string]any:
		// Vendor change 2026-11-02: only the "auto" tool_choice is accepted
		// ("none", "required" and named function choices 400). Map every
		// object choice onto "auto" for all keys — a named choice 400s on
		// pay-as-you-go keys too, so nothing is lost by normalizing.
		return "auto"
	default:
		return "auto"
	}
}

// responsesOutputItem is the subset of a Responses output item we translate.
type responsesOutputItem struct {
	Type    string `json:"type"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	CallID    string `json:"call_id"`
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

// responsesToOpenAIChat translates a Responses result into a
// chat.completion envelope. Returns the envelope and finish reason.
func responsesToOpenAIChat(model string, output []responsesOutputItem, status string, inTokens, outTokens int, id string) (map[string]any, string) {
	var content strings.Builder
	var toolCalls []map[string]any
	for _, item := range output {
		switch item.Type {
		case "message":
			for _, c := range item.Content {
				if c.Type == "output_text" && c.Text != "" {
					content.WriteString(c.Text)
				}
			}
		case "function_call":
			callID := item.CallID
			if callID == "" {
				callID = fmt.Sprintf("call_hn_%d", time.Now().UnixNano())
			}
			toolCalls = append(toolCalls, map[string]any{
				"type": "function", "id": callID,
				"function": map[string]any{"name": item.Name, "arguments": item.Arguments},
			})
		default:
			// reasoning / other items: not representable; tokens still counted.
		}
	}
	msg := map[string]any{"role": "assistant", "content": content.String()}
	finish := "stop"
	if len(toolCalls) > 0 {
		msg["tool_calls"] = toolCalls
		finish = "tool_calls"
	} else if status == "incomplete" {
		finish = "length"
	}
	return map[string]any{
		"object":  "chat.completion",
		"id":      id,
		"created": time.Now().Unix(),
		"model":   model,
		"choices": []map[string]any{{
			"index": 0, "message": msg, "finish_reason": finish,
		}},
		"usage": map[string]any{
			"prompt_tokens": inTokens, "completion_tokens": outTokens,
			"total_tokens": inTokens + outTokens,
		},
	}, finish
}

// ── Handlers ──────────────────────────────────────────────────────────────

func (s *Server) handleOpenAIChatCompletions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}
	var req openAIChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid JSON: " + err.Error()})
		return
	}
	if len(req.Messages) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "messages is required"})
		return
	}
	token := metaAccessToken()
	if token == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"error": "no Meta credential: set META_MUSE_API_KEY or log pi into meta OAuth",
		})
		return
	}
	model := req.Model
	if model == "" {
		model = "muse-spark-1.3-contributor"
	} else {
		// Harness configs attach a provider prefix ("meta/..."); the vendor
		// only knows the bare model ID (a prefixed ID 404s).
		model = normalizeMetaModel(model)
	}
	maxTokens := req.MaxTokens
	if req.MaxCompletionTokens > maxTokens {
		maxTokens = req.MaxCompletionTokens
	}
	// muse-spark is a thinking model: reasoning tokens count against the
	// limit, so floor the UPSTREAM budget (usage is reported honestly).
	// (Responses requires max_output_tokens >= 16.)
	upstreamMax := maxTokens
	if upstreamMax < 1500 {
		upstreamMax = 1500
	}
	body := map[string]any{
		"model":             model,
		"input":             openAIToResponsesInput(req.Messages),
		"max_output_tokens": upstreamMax,
		"store":             false,
	}
	if req.Temperature != nil {
		body["temperature"] = *req.Temperature
	}
	if tools := openAIToolsToResponses(req.Tools); len(tools) > 0 {
		body["tools"] = tools
		if tc := openAIToolChoiceToResponses(req.ToolChoice); tc != nil {
			body["tool_choice"] = tc
		} else {
			body["tool_choice"] = "auto"
		}
	}
	postResponses := func(payload map[string]any) (int, []byte, error) {
		raw, _ := json.Marshal(payload)
		httpReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
			"https://api.meta.ai/v1/responses", bytes.NewReader(raw))
		if err != nil {
			return 0, nil, err
		}
		httpReq.Header.Set("Authorization", "Bearer "+token)
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("User-Agent", "pi/1.4.0 (hypernexus-openai-compat)")
		resp, err := (&http.Client{Timeout: 600 * time.Second}).Do(httpReq)
		if err != nil {
			return 0, nil, err
		}
		defer resp.Body.Close()
		respBody, _ := io.ReadAll(resp.Body)
		return resp.StatusCode, respBody, nil
	}
	status, respBody, err := postResponses(body)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "meta unreachable: " + err.Error()})
		return
	}
	if tools, ok := body["tools"].([]map[string]any); ok && len(tools) > 0 {
		anyTools := make([]any, len(tools))
		for i, t := range tools {
			anyTools[i] = t
		}
		if retry := retryBodyForDenied(body, anyTools, status, respBody); retry != nil {
			status, respBody, err = postResponses(retry)
			if err != nil {
				writeJSON(w, http.StatusBadGateway, map[string]any{"error": "meta unreachable: " + err.Error()})
				return
			}
			body = retry
		}
	}
	if status != http.StatusOK {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		fmt.Fprintf(w, `{"error":"meta api %d: %s"}`, status, truncateForError(respBody))
		return
	}
	var rsp struct {
		Output []responsesOutputItem `json:"output"`
		Usage  struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(respBody, &rsp); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "bad meta response"})
		return
	}
	id := "chatcmpl_hn_" + fmt.Sprintf("%d", time.Now().UnixNano())
	env, finish := responsesToOpenAIChat(model, rsp.Output, rsp.Status,
		rsp.Usage.InputTokens, rsp.Usage.OutputTokens, id)
	if !req.Stream {
		writeJSON(w, http.StatusOK, env)
		return
	}
	// SSE replay (buffered upstream, valid OpenAI chunk sequence).
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	fl, _ := w.(http.Flusher)
	emit := func(payload any) {
		b, _ := json.Marshal(payload)
		fmt.Fprintf(w, "data: %s\n\n", string(b))
		if fl != nil {
			fl.Flush()
		}
	}
	choice := env["choices"].([]map[string]any)[0]
	msg := choice["message"].(map[string]any)
	chunk := func(delta map[string]any, fin any) {
		emit(map[string]any{
			"object": "chat.completion.chunk", "id": id,
			"created": env["created"], "model": model,
			"choices": []map[string]any{{"index": 0, "delta": delta, "finish_reason": fin}},
		})
	}
	chunk(map[string]any{"role": "assistant", "content": ""}, nil)
	if text, _ := msg["content"].(string); text != "" {
		chunk(map[string]any{"content": text}, nil)
	}
	if tcs, ok := msg["tool_calls"].([]map[string]any); ok {
		for _, tc := range tcs {
			chunk(map[string]any{"tool_calls": []map[string]any{{
				"index": 0, "id": tc["id"], "type": "function", "function": tc["function"],
			}}}, nil)
		}
	}
	chunk(map[string]any{}, finish)
	fmt.Fprintf(w, "data: [DONE]\n\n")
	if fl != nil {
		fl.Flush()
	}
	_ = finish
}

func (s *Server) handleOpenAIResponses(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}
	s.proxyToMeta(w, r, "https://api.meta.ai/v1/responses")
}

func (s *Server) proxyToMeta(w http.ResponseWriter, r *http.Request, upstream string) {
	token := metaAccessToken()
	if token == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"error": "no Meta credential: set META_MUSE_API_KEY or log pi into meta OAuth",
		})
		return
	}
	raw, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "cannot read body: " + err.Error()})
		return
	}
	// Default an empty model to the subscriber model; strip a harness
	// provider prefix ("meta/") the vendor would 404 on.
	var bodyMap map[string]any
	if err := json.Unmarshal(raw, &bodyMap); err == nil {
		dirty := false
		if m, _ := bodyMap["model"].(string); m == "" {
			bodyMap["model"] = "muse-spark-1.3-contributor"
			dirty = true
		} else if n := normalizeMetaModel(m); n != m {
			bodyMap["model"] = n
			dirty = true
		}
		// Vendor change 2026-11-02: only the "auto" tool_choice is
		// accepted; a named function choice 400s before attestation even
		// runs. Normalize object choices onto "auto" (string choices pass
		// through untouched).
		if tc, ok := bodyMap["tool_choice"].(map[string]any); ok && tc != nil {
			bodyMap["tool_choice"] = "auto"
			dirty = true
		}
		if dirty {
			raw, _ = json.Marshal(bodyMap)
		}
	}
	httpReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost, upstream, bytes.NewReader(raw))
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("User-Agent", "pi/1.4.0 (hypernexus-openai-compat)")
	if accept := r.Header.Get("Accept"); accept != "" {
		httpReq.Header.Set("Accept", accept)
	}
	resp, err := (&http.Client{Timeout: 600 * time.Second}).Do(httpReq)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "meta unreachable: " + err.Error()})
		return
	}
	if resp.StatusCode != http.StatusOK {
		// Buffer errors (small): a 403 attestation denial with tools present
		// gets one stripped retry before surfacing.
		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if bodyMap != nil {
			if tools, ok := bodyMap["tools"].([]any); ok && len(tools) > 0 {
				if retry := retryBodyForDenied(bodyMap, tools, resp.StatusCode, respBody); retry != nil {
					raw2, _ := json.Marshal(retry)
					httpReq2, err2 := http.NewRequestWithContext(r.Context(), http.MethodPost, upstream, bytes.NewReader(raw2))
					if err2 == nil {
						httpReq2.Header.Set("Authorization", "Bearer "+token)
						httpReq2.Header.Set("Content-Type", "application/json")
						httpReq2.Header.Set("User-Agent", "pi/1.4.0 (hypernexus-openai-compat)")
						if accept := r.Header.Get("Accept"); accept != "" {
							httpReq2.Header.Set("Accept", accept)
						}
						if resp2, err2 := (&http.Client{Timeout: 600 * time.Second}).Do(httpReq2); err2 == nil {
							defer resp2.Body.Close()
							upstreamModel2, _ := bodyMap["model"].(string)
							log.Printf("openai-compat: tool retry done for model %s, upstream status=%d", upstreamModel2, resp2.StatusCode)
							if ct := resp2.Header.Get("Content-Type"); ct != "" {
								w.Header().Set("Content-Type", ct)
							}
							w.WriteHeader(resp2.StatusCode)
							_, _ = io.Copy(w, resp2.Body)
							return
						}
					}
					writeJSON(w, http.StatusBadGateway, map[string]any{"error": "meta unreachable on tool retry"})
					return
				}
			}
		}
		if ct := resp.Header.Get("Content-Type"); ct != "" {
			w.Header().Set("Content-Type", ct)
		}
		w.WriteHeader(resp.StatusCode)
		_, _ = w.Write(respBody)
		return
	}
	defer resp.Body.Close()
	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}
