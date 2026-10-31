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

// openAIToolChoiceToResponses maps the chat-completions tool_choice onto the
// Responses equivalent.
func openAIToolChoiceToResponses(tc any) any {
	switch v := tc.(type) {
	case nil:
		return nil
	case string:
		return v // auto | none | required
	case map[string]any:
		if v["type"] == "function" {
			if fn, ok := v["function"].(map[string]any); ok {
				if name, ok := fn["name"].(string); ok && name != "" {
					return map[string]any{"type": "function", "name": name}
				}
			}
		}
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
	raw, _ := json.Marshal(body)
	httpReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
		"https://api.meta.ai/v1/responses", bytes.NewReader(raw))
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("User-Agent", "pi/1.4.0 (hypernexus-openai-compat)")
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
	// Default an empty model to the subscriber model; otherwise untouched.
	var bodyMap map[string]any
	if err := json.Unmarshal(raw, &bodyMap); err == nil {
		if m, _ := bodyMap["model"].(string); m == "" {
			bodyMap["model"] = "muse-spark-1.3-contributor"
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
	defer resp.Body.Close()
	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}
