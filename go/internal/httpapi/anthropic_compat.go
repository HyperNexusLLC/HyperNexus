package httpapi

// Anthropic Messages API compatibility shim.
//
// Lets Claude Code (and any Anthropic SDK client) run against HyperNexus with
// the Meta subscriber model underneath:
//
//	ANTHROPIC_BASE_URL=http://127.0.0.1:7778 ANTHROPIC_API_KEY=dummy \
//	  claude -p --model muse-spark-1.3-contributor "hi"
//
// Flow: Anthropic Messages request -> OpenAI chat-completions translation ->
// https://api.meta.ai/v1/chat/completions (Bearer = pi OAuth access token,
// re-read per request so pi-side refreshes are picked up) -> translated back
// to Anthropic Messages (JSON or SSE).
//
// Streaming note: the upstream call is buffered, then replayed as a valid
// Anthropic SSE sequence. Same tokens/latency as non-stream; progress events
// arrive at completion. Tool calls are fully supported in both modes.

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
	raw, err := os.ReadFile(filepath.Join(home, ".pi", "agent", "auth.json"))
	if err != nil {
		return ""
	}
	var auth map[string]struct {
		Type    string `json:"type"`
		Key     string `json:"key"`
		Access  string `json:"access"`
		Refresh string `json:"refresh"`
	}
	if err := json.Unmarshal(raw, &auth); err != nil {
		return ""
	}
	if m, ok := auth["meta"]; ok {
		if m.Access != "" {
			return m.Access
		}
		return m.Key
	}
	return ""
}

// ── Anthropic -> OpenAI translation ───────────────────────────────────────

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

type openaiToolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

func anthropicToOpenAI(req *anthropicMessagesRequest) []map[string]any {
	var out []map[string]any
	if sys := anthropicTextOf(req.System); sys != "" {
		out = append(out, map[string]any{"role": "system", "content": sys})
	}
	for _, m := range req.Messages {
		switch m.Role {
		case "user":
			// May contain tool_result blocks. Preserve ORIGINAL order: OpenAI requires
			// tool messages to immediately follow the assistant message with tool_calls.
			// Emitting a text user message first breaks that adjacency (-> 400).
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
					flush() // text accumulated so far goes first, then the tool message
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
						"role": "tool", "tool_call_id": id, "content": contentStr,
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
				var calls []openaiToolCall
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
						var tc openaiToolCall
						tc.ID, _ = bm["id"].(string)
						tc.Type = "function"
						tc.Function.Name, _ = bm["name"].(string)
						if inp, ok := bm["input"].(map[string]any); ok {
							ab, _ := json.Marshal(inp)
							tc.Function.Arguments = string(ab)
						} else {
							tc.Function.Arguments = "{}"
						}
						calls = append(calls, tc)
					}
				}
				msg := map[string]any{"role": "assistant"}
				if len(texts) > 0 {
					msg["content"] = strings.Join(texts, "\n")
				} else {
					msg["content"] = nil
				}
				if len(calls) > 0 {
					msg["tool_calls"] = calls
				}
				out = append(out, msg)
			} else {
				out = append(out, map[string]any{"role": "assistant", "content": anthropicTextOf(m.Content)})
			}
		}
	}
	return out
}

func anthropicToolsToOpenAI(tools []anthropicTool) []map[string]any {
	var out []map[string]any
	for _, t := range tools {
		params := t.InputSchema
		if params == nil {
			params = map[string]any{"type": "object", "properties": map[string]any{}}
		}
		out = append(out, map[string]any{
			"type": "function",
			"function": map[string]any{
				"name": t.Name, "description": t.Description, "parameters": params,
			},
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
	upstreamMax := maxTokens
	if upstreamMax < 1500 {
		upstreamMax = 1500
	}
	body := map[string]any{
		"model":       model,
		"messages":    anthropicToOpenAI(&req),
		"max_tokens":  upstreamMax,
		"temperature": 0.7,
	}
	if req.Temperature != nil {
		body["temperature"] = *req.Temperature
	}
	if tools := anthropicToolsToOpenAI(req.Tools); len(tools) > 0 {
		body["tools"] = tools
		body["tool_choice"] = "auto"
	}
	raw, _ := json.Marshal(body)
	if os.Getenv("HN_DEBUG_ANTHROPIC") != "" {
		os.WriteFile(os.ExpandEnv("$HOME\\hypernexus-anthropic-debug.json"), raw, 0600)
	}
	httpReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
		"https://api.meta.ai/v1/chat/completions", bytes.NewReader(raw))
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
	var oai struct {
		Choices []struct {
			Message struct {
				Content   *string          `json:"content"`
				ToolCalls []openaiToolCall `json:"tool_calls"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(respBody, &oai); err != nil || len(oai.Choices) == 0 {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "bad meta response"})
		return
	}
	ch := oai.Choices[0]
	// Build Anthropic content blocks.
	var blocks []map[string]any
	if ch.Message.Content != nil && *ch.Message.Content != "" {
		blocks = append(blocks, map[string]any{"type": "text", "text": *ch.Message.Content})
	}
	for _, tc := range ch.Message.ToolCalls {
		var input map[string]any
		_ = json.Unmarshal([]byte(tc.Function.Arguments), &input)
		if input == nil {
			input = map[string]any{}
		}
		blocks = append(blocks, map[string]any{
			"type": "tool_use", "id": tc.ID, "name": tc.Function.Name, "input": input,
		})
	}
	stop := "end_turn"
	if len(ch.Message.ToolCalls) > 0 {
		stop = "tool_use"
	} else if ch.FinishReason == "length" {
		stop = "max_tokens"
	}
	msgID := "msg_hn_" + fmt.Sprintf("%d", time.Now().UnixNano())
	usage := map[string]any{
		"input_tokens": oai.Usage.PromptTokens, "output_tokens": oai.Usage.CompletionTokens,
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
		"delta": map[string]any{"stop_reason": stop}, "usage": map[string]any{"output_tokens": oai.Usage.CompletionTokens}})
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
