package httpapi

// Anthropic Messages API compatibility shim.
//
// Lets Claude Code (and any Anthropic SDK client) run against HyperNexus with
// the Meta subscriber model underneath:
//
//	ANTHROPIC_BASE_URL=http://127.0.0.1:7778 ANTHROPIC_API_KEY=dummy \
//	  claude -p --model muse-spark-1.3-contributor "hi"
//
// Flow: Anthropic Messages request -> Responses API translation ->
// https://api.meta.ai/v1/responses (Bearer = pi OAuth access token,
// re-read per request so pi-side refreshes are picked up) -> translated back
// to Anthropic Messages (JSON or SSE).
//
// Why Responses, not chat-completions: the subscription credential only covers
// the Responses API (chat-completions is rejected with client_attestation_denied
// — "Muse Code subscriptions cover the Muse Code client on the Responses API
// only"). pi's own Meta provider uses the same Responses API.
//
// Streaming note: the upstream call is buffered (non-streaming Responses),
// then replayed as a valid Anthropic SSE sequence. Tool calls are fully
// supported in both modes (multi-turn loops replay via function_call_output).

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ── Request shapes (Anthropic) ────────────────────────────────────────────

type anthropicContentBlock struct {
	Type      string         `json:"type"`
	Text      string         `json:"text,omitempty"`
	ID        string         `json:"id,omitempty"`
	Name      string         `json:"name,omitempty"`
	Input     map[string]any `json:"input,omitempty"`
	ToolUseID string         `json:"tool_use_id,omitempty"`
	Content   any            `json:"content,omitempty"`
}

type anthropicMessage struct {
	Role    string                  `json:"role"`
	Content any                     `json:"content,omitempty"` // string or []block
}

type anthropicTool struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	InputSchema map[string]any `json:"input_schema,omitempty"`
}

type anthropicMessagesRequest struct {
	Model       string             `json:"model"`
	MaxTokens   int                `json:"max_tokens"`
	System      any                `json:"system,omitempty"` // string or []block
	Messages    []anthropicMessage `json:"messages"`
	Tools       []anthropicTool    `json:"tools,omitempty"`
	ToolChoice  any                `json:"tool_choice,omitempty"`
	Stream      bool               `json:"stream,omitempty"`
	Temperature *float64           `json:"temperature,omitempty"`
}

// ── Meta token ────────────────────────────────────────────────────────────

// metaAccessToken returns the Meta subscriber credential. Env override first,
// then pi's OAuth store (re-read every request so pi-side refreshes flow
// through without a kernel restart).
func metaAccessToken() string {
	if k := os.Getenv("META_MUSE_API_KEY"); k != "" {
		return k
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	for _, rel := range []string{
		filepath.Join(home, ".pi", "agent", "auth.json"),
		filepath.Join(home, ".prime", "agent", "auth.json"),
	} {
		raw, err := os.ReadFile(rel)
		if err != nil {
			continue
		}
		var auth map[string]struct {
			Type    string `json:"type"`
			Key     string `json:"key"`
			Access  string `json:"access"`
			Refresh string `json:"refresh"`
		}
		if err := json.Unmarshal(raw, &auth); err != nil {
			continue
		}
		if m, ok := auth["meta"]; ok {
			if m.Access != "" {
				return m.Access
			}
			if m.Key != "" {
				return m.Key
			}
		}
	}
	return ""
}

// ── Anthropic -> Responses translation ──────────────────────────────────────
//
// The subscription credential only covers the Responses API
// (POST https://api.meta.ai/v1/responses) — chat-completions is rejected with
// client_attestation_denied. So the Anthropic Messages request is translated
// to a Responses request (pi's own Meta provider uses the same API):
//
//	Anthropic user text            -> {role:"user", content:"..."}
//	Anthropic assistant text       -> {role:"assistant", content:[{type:"output_text",text}]}
//	Anthropic tool_use             -> {type:"function_call", call_id, name, arguments}
//	Anthropic tool_result          -> {type:"function_call_output", call_id, output}
//	Anthropic tools                -> {type:"function", name, description, parameters}
//
// The upstream call is non-streaming; the shim replays it as a valid Anthropic
// SSE sequence when the client asked for stream (same tokens/latency).

func anthropicTextOf(content any) string {
	switch c := content.(type) {
	case string:
		return c
	case []any:
		var sb strings.Builder
		for _, b := range c {
			m, ok := b.(map[string]any)
			if !ok {
				continue
			}
			if m["type"] == "text" {
				if t, ok := m["text"].(string); ok {
					sb.WriteString(t)
				}
			}
		}
		return sb.String()
	default:
		return ""
	}
}

type responsesFuncCall struct {
	CallID    string `json:"call_id"`
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

// anthropicToResponses converts an Anthropic Messages request into a Responses
// API input item list. Assistant text is preserved as output_text content so
// multi-turn tool loops replay faithfully; tool_result blocks become
// function_call_output items keyed by the tool_use id (Responses pairs them
// via call_id).
func anthropicToResponses(req *anthropicMessagesRequest) []map[string]any {
	var out []map[string]any
	if sys := anthropicTextOf(req.System); sys != "" {
		out = append(out, map[string]any{"role": "system", "content": sys})
	}
	for _, m := range req.Messages {
		switch m.Role {
		case "user":
			// May contain tool_result blocks. Each becomes a freestanding
			// function_call_output item (Responses pairs via call_id, so no
			// adjacency constraint unlike chat-completions); text accumulates
			// into one user message in original order.
			if blocks, ok := m.Content.([]any); ok {
				var texts []string
				flush := func() {
					if len(texts) > 0 {
						out = append(out, map[string]any{"role": "user", "content": strings.Join(texts, "\n")})
						texts = nil
					}
				}
				for _, b := range blocks {
					bm, ok := b.(map[string]any)
					if !ok {
						continue
					}
					switch bm["type"] {
					case "text":
						if t, ok := bm["text"].(string); ok {
							texts = append(texts, t)
						}
					case "tool_result":
						flush() // text accumulated so far goes first, then the output item
						var contentStr string
						switch c := bm["content"].(type) {
						case string:
							contentStr = c
					default:
						cb, _ := json.Marshal(c)
						contentStr = string(cb)
					}
					id, _ := bm["tool_use_id"].(string)
					out = append(out, map[string]any{
						"type": "function_call_output", "call_id": id, "output": contentStr,
					})
				}
			}
			flush()
			} else {
				out = append(out, map[string]any{"role": "user", "content": anthropicTextOf(m.Content)})
			}
		case "assistant":
			if blocks, ok := m.Content.([]any); ok {
				var texts []string
				var calls []responsesFuncCall
				for _, b := range blocks {
					bm, ok := b.(map[string]any)
					if !ok {
						continue
					}
					switch bm["type"] {
					case "text":
						if t, ok := bm["text"].(string); ok {
							texts = append(texts, t)
						}
					case "tool_use":
						var tc responsesFuncCall
						tc.CallID, _ = bm["id"].(string)
						tc.Name, _ = bm["name"].(string)
						if inp, ok := bm["input"].(map[string]any); ok {
							ab, _ := json.Marshal(inp)
							tc.Arguments = string(ab)
						} else {
							tc.Arguments = "{}"
						}
						calls = append(calls, tc)
					}
				}
				// Responses replays history as items: the assistant text as an
				// output_text message item, then one function_call item per call.
				if len(texts) > 0 {
					out = append(out, map[string]any{
						"role": "assistant",
						"content": []map[string]any{
							{"type": "output_text", "text": strings.Join(texts, "\n")},
						},
					})
				}
				for _, tc := range calls {
					out = append(out, map[string]any{
						"type": "function_call",
						"call_id": tc.CallID, "name": tc.Name, "arguments": tc.Arguments,
					})
				}
				if len(texts) == 0 && len(calls) == 0 {
					out = append(out, map[string]any{"role": "assistant", "content": ""})
				}
			} else {
				out = append(out, map[string]any{"role": "assistant", "content": anthropicTextOf(m.Content)})
			}
		}
	}
	return out
}

func anthropicToolsToResponses(tools []anthropicTool) []map[string]any {
	var out []map[string]any
	for _, t := range tools {
		params := t.InputSchema
		if params == nil {
			params = map[string]any{"type": "object", "properties": map[string]any{}}
		}
		out = append(out, map[string]any{
			"type": "function",
			"name": t.Name, "description": t.Description, "parameters": params,
		})
	}
	return out
}

// ── Handlers ──────────────────────────────────────────────────────────────

func (s *Server) handleAnthropicModels(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"object": "list",
		"data": []map[string]any{
			{"id": "muse-spark-1.3-contributor", "object": "model", "owned_by": "meta"},
			{"id": "muse-spark-1.3", "object": "model", "owned_by": "meta"},
			{"id": "muse-spark-1.2-contributor", "object": "model", "owned_by": "meta"},
		},
	})
}

func (s *Server) handleAnthropicMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}
	var req anthropicMessagesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid JSON: " + err.Error()})
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
	}
	maxTokens := req.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 1024
	}
	// muse-spark is a thinking model: reasoning tokens count against the limit.
	// Claude Code's small max_tokens would truncate the trace into empty output,
	// so floor the UPSTREAM budget while still honoring the client's limit in
	// spirit (usage is reported honestly from the upstream response).
	// (Responses requires max_output_tokens >= 16; the floor below satisfies it.)
	upstreamMax := maxTokens
	if upstreamMax < 1500 {
		upstreamMax = 1500
	}
	body := map[string]any{
		"model":             model,
		"input":             anthropicToResponses(&req),
		"max_output_tokens": upstreamMax,
		"temperature":       0.7,
		"store":             false,
	}
	if req.Temperature != nil {
		body["temperature"] = *req.Temperature
	}
	if tools := anthropicToolsToResponses(req.Tools); len(tools) > 0 {
		body["tools"] = tools
		body["tool_choice"] = "auto"
	}
	raw, _ := json.Marshal(body)
	if os.Getenv("HN_DEBUG_ANTHROPIC") != "" {
		os.WriteFile(os.ExpandEnv("$HOME\\hypernexus-anthropic-debug.json"), raw, 0600)
	}
	httpReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
		"https://api.meta.ai/v1/responses", bytes.NewReader(raw))
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Content-Type", "application/json")
	resp, err := (&http.Client{Timeout: 600 * time.Second}).Do(httpReq)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "meta unreachable: " + err.Error()})
		return
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		fmt.Fprintf(w, `{"error":"meta api %d: %s"}`, resp.StatusCode, truncateForError(respBody))
		return
	}
	// Responses non-streaming shape: {output:[{type,message|function_call|reasoning...}], usage:{...}}.
	var rsp struct {
		Output []struct {
			Type    string `json:"type"`
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
			CallID    string `json:"call_id"`
			Name      string `json:"name"`
			Arguments string `json:"arguments"`
		} `json:"output"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(respBody, &rsp); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "bad meta response"})
		return
	}
	// Build Anthropic content blocks.
	var blocks []map[string]any
	for _, item := range rsp.Output {
		switch item.Type {
		case "message":
			var texts []string
			for _, c := range item.Content {
				if c.Type == "output_text" && c.Text != "" {
					texts = append(texts, c.Text)
				}
			}
			if len(texts) > 0 {
				blocks = append(blocks, map[string]any{"type": "text", "text": strings.Join(texts, "")})
			}
		case "function_call":
			var input map[string]any
			_ = json.Unmarshal([]byte(item.Arguments), &input)
			if input == nil {
				input = map[string]any{}
			}
			blocks = append(blocks, map[string]any{
				"type": "tool_use", "id": item.CallID, "name": item.Name, "input": input,
			})
		default:
			// reasoning / other items: not representable as Anthropic blocks;
			// their tokens are still counted in usage.
		}
	}
	stop := "end_turn"
	hasToolUse := false
	for _, b := range blocks {
		if b["type"] == "tool_use" {
			hasToolUse = true
		}
	}
	if hasToolUse {
		stop = "tool_use"
	} else if rsp.Status == "incomplete" {
		stop = "max_tokens"
	}
	msgID := "msg_hn_" + fmt.Sprintf("%d", time.Now().UnixNano())
	usage := map[string]any{
		"input_tokens": rsp.Usage.InputTokens, "output_tokens": rsp.Usage.OutputTokens,
	}
	if !req.Stream {
		writeJSON(w, http.StatusOK, map[string]any{
			"id": msgID, "type": "message", "role": "assistant",
			"content": blocks, "model": model, "stop_reason": stop, "usage": usage,
		})
		return
	}
	// SSE replay (buffered upstream, valid Anthropic event sequence).
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	fl, _ := w.(http.Flusher)
	emit := func(event string, payload any) {
		b, _ := json.Marshal(payload)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, string(b))
		if fl != nil {
			fl.Flush()
		}
	}
	emit("message_start", map[string]any{"type": "message_start",
		"message": map[string]any{"id": msgID, "type": "message", "role": "assistant",
			"content": []any{}, "model": model, "stop_reason": nil, "usage": usage}})
	for i, b := range blocks {
		emit("content_block_start", map[string]any{"type": "content_block_start",
			"index": i, "content_block": b})
		if b["type"] == "text" {
			emit("content_block_delta", map[string]any{"type": "content_block_delta",
				"index": i, "delta": map[string]any{"type": "text_delta", "text": b["text"]}})
		} else {
			ib, _ := json.Marshal(b["input"])
			emit("content_block_delta", map[string]any{"type": "content_block_delta",
				"index": i, "delta": map[string]any{"type": "input_json_delta", "partial_json": string(ib)}})
		}
		emit("content_block_stop", map[string]any{"type": "content_block_stop", "index": i})
	}
	emit("message_delta", map[string]any{"type": "message_delta",
		"delta": map[string]any{"stop_reason": stop}, "usage": map[string]any{"output_tokens": rsp.Usage.OutputTokens}})
	emit("message_stop", map[string]any{"type": "message_stop"})
	_ = msgID
}

func truncateForError(b []byte) string {
	s := strings.TrimSpace(string(b))
	if len(s) > 300 {
		s = s[:300] + "…"
	}
	s = strings.ReplaceAll(s, `"`, "'")
	return s
}
