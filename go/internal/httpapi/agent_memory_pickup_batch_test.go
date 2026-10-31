package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/config"
)

// Pickup must replay a multi-entry artifact with ONE store rewrite, not one
// per entry: per-entry rewrites blew past the 2.5s client timeout once the
// store grew (pi execute lifecycle + prime-agent handoff flakes) and multiplied
// Windows rename contention into 503s.
func TestAgentMemoryPickupRestoresBatchEntries(t *testing.T) {
	t.Setenv("HYPERNEXUS_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})
	defer server.Close()

	for i := 0; i < 3; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/agent-memory/add",
			strings.NewReader(`{"content":"batch handoff context `+strconv.Itoa(i)+`","type":"session","namespace":"agent"}`))
		server.Handler().ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("seed entry %d: got %d %s", i, rec.Code, rec.Body.String())
		}
	}

	handoffRecorder := httptest.NewRecorder()
	handoffReq := httptest.NewRequest(http.MethodPost, "/api/agent-memory/handoff", strings.NewReader(`{"notes":"batch handoff"}`))
	server.Handler().ServeHTTP(handoffRecorder, handoffReq)
	if handoffRecorder.Code != http.StatusOK {
		t.Fatalf("handoff: got %d %s", handoffRecorder.Code, handoffRecorder.Body.String())
	}
	var handoffResponse struct {
		Success bool   `json:"success"`
		Data    string `json:"data"`
	}
	if err := json.Unmarshal(handoffRecorder.Body.Bytes(), &handoffResponse); err != nil {
		t.Fatalf("unmarshal handoff response: %v", err)
	}

	clearRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(clearRecorder, httptest.NewRequest(http.MethodPost, "/api/agent-memory/clear-session", nil))
	if clearRecorder.Code != http.StatusOK {
		t.Fatalf("clear-session: got %d %s", clearRecorder.Code, clearRecorder.Body.String())
	}

	pickupRecorder := httptest.NewRecorder()
	pickupReq := httptest.NewRequest(http.MethodPost, "/api/agent-memory/pickup", strings.NewReader(`{"artifact":`+strconv.Quote(handoffResponse.Data)+`}`))
	server.Handler().ServeHTTP(pickupRecorder, pickupReq)
	if pickupRecorder.Code != http.StatusOK || !strings.Contains(pickupRecorder.Body.String(), `"count":3`) {
		t.Fatalf("expected batch pickup count 3, got %d %s", pickupRecorder.Code, pickupRecorder.Body.String())
	}

	recentRecorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recentRecorder, httptest.NewRequest(http.MethodGet, "/api/agent-memory/recent?type=session&limit=10", nil))
	body := recentRecorder.Body.String()
	for i := 0; i < 3; i++ {
		if !strings.Contains(body, "batch handoff context "+strconv.Itoa(i)) {
			t.Fatalf("expected restored entry %d, got %s", i, body)
		}
	}
}
