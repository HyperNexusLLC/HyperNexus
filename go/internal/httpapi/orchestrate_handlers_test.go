package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/config"
)

func TestAgentOrchestrateLocalFallback(t *testing.T) {
	t.Setenv("HYPERNEXUS_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.MainConfigDir = t.TempDir()
	seedPersistedAgentMemories(t, cfg.WorkspaceRoot)

	server := New(cfg, stubDetector{})
	defer server.Close()

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/agent/orchestrate",
		strings.NewReader(`{"goal":"agent memory orchestration","sessionId":"test-session","harness":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	server.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("orchestrate expected 200, got %d with body %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Success bool `json:"success"`
		Data    struct {
			Goal          string           `json:"goal"`
			SessionID     string           `json:"sessionId"`
			RecallCount   int              `json:"recallCount"`
			ScratchpadKey string           `json:"scratchpadKey"`
			Steps         []string         `json:"steps"`
			Recall        []map[string]any `json:"recall"`
		} `json:"data"`
		Bridge map[string]any `json:"bridge"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !body.Success || body.Data.Goal != "agent memory orchestration" {
		t.Fatalf("unexpected body: %s", rec.Body.String())
	}
	if body.Data.SessionID != "test-session" || body.Data.ScratchpadKey != "orchestrate:test-session" {
		t.Fatalf("unexpected session/scratchpad key: %s", rec.Body.String())
	}
	if len(body.Data.Steps) != 4 {
		t.Fatalf("expected 4 orchestration steps, got %d", len(body.Data.Steps))
	}
	if body.Bridge["fallback"] != "go-local-orchestrate" {
		t.Fatalf("expected go-local-orchestrate bridge, got %v", body.Bridge)
	}
}

func TestAgentOrchestrateRequiresGoal(t *testing.T) {
	t.Setenv("HYPERNEXUS_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})
	defer server.Close()

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/agent/orchestrate", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	server.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("missing goal expected 400, got %d with body %s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	server.Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/agent/orchestrate", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET expected 405, got %d", rec.Code)
	}
}
