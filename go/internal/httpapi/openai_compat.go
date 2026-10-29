package httpapi

// OpenAI-compatible passthrough for the Meta subscriber model.
//
// Lets any OpenAI SDK client (opencode, codex-cli, atom, mini-swe-agent via
// litellm, open-interpreter, jcode, crush, hax, ...) run against HyperNexus
// with the Meta subscription underneath:
//
//	OPENAI_API_BASE=http://127.0.0.1:7778/v1 OPENAI_API_KEY=dummy <client>
//
// The Meta Bearer token is re-read from pi's OAuth store on EVERY request
// (see metaAccessToken in anthropic_compat.go), so pi-side refreshes — the
// subscription key rotates every ~24h — flow through with no re-sync, no
// kernel restart, no stale copies in .env files.
//
// Request bodies pass through untouched (only an empty model is defaulted),
// with Authorization + User-Agent injected. Streaming (SSE) is proxied as a
// raw byte stream. Subscription-only limitations of the upstream API
// (e.g. background mode) surface as the upstream's own error.

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"time"
)

// ── Handlers ──────────────────────────────────────────────────────────────

func (s *Server) handleOpenAIChatCompletions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}
	s.proxyToMeta(w, r, "https://api.meta.ai/v1/chat/completions")
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
