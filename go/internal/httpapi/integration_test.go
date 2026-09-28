package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/config"
)

func newTestServerHelper(t *testing.T) *Server {
	t.Helper()
	return New(config.Default(), stubDetector{})
}

func TestDashboardEndpoint(t *testing.T) {
	server := newTestServerHelper(t)
	req := httptest.NewRequest(http.MethodGet, "/dashboard", nil)
	rr := httptest.NewRecorder()
	server.Handler().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("dashboard: expected 200, got %d", rr.Code)
	}
	body := rr.Body.String()
	if !strings.Contains(body, "HyperNexus Dashboard") {
		t.Error("dashboard: missing expected title")
	}
	if !strings.Contains(body, "refresh()") {
		t.Error("dashboard: missing JavaScript refresh")
	}
}

func TestScratchpadGetSetIntegration(t *testing.T) {
	server := newTestServerHelper(t)

	// Set a value
	setReq := httptest.NewRequest(http.MethodPost, "/api/memory/scratchpad/set",
		strings.NewReader(`{"key":"test-integration","value":"hello from test"}`))
	setReq.Header.Set("Content-Type", "application/json")
	setRR := httptest.NewRecorder()
	server.Handler().ServeHTTP(setRR, setReq)

	if setRR.Code != http.StatusOK {
		t.Fatalf("scratchpad set: expected 200, got %d", setRR.Code)
	}

	// Get all values
	getReq := httptest.NewRequest(http.MethodGet, "/api/memory/scratchpad/get", nil)
	getRR := httptest.NewRecorder()
	server.Handler().ServeHTTP(getRR, getReq)

	var getResult map[string]any
	if err := json.Unmarshal(getRR.Body.Bytes(), &getResult); err != nil {
		t.Fatalf("scratchpad get: invalid JSON: %v", err)
	}
	scratchpad, ok := getResult["scratchpad"].(map[string]any)
	if !ok {
		t.Fatal("scratchpad get: missing scratchpad field")
	}
	if scratchpad["test-integration"] != "hello from test" {
		t.Errorf("scratchpad get: expected 'hello from test', got %v", scratchpad["test-integration"])
	}
}

func TestMemorySearchIntegration(t *testing.T) {
	server := newTestServerHelper(t)
	req := httptest.NewRequest(http.MethodGet, "/api/memory/search?query=test&limit=5", nil)
	rr := httptest.NewRecorder()
	server.Handler().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("memory search: expected 200, got %d", rr.Code)
	}

	var result map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("memory search: invalid JSON: %v", err)
	}
	if result["success"] != true {
		t.Errorf("memory search: expected success=true, got %v", result["success"])
	}
}

func TestReEmbedIntegration(t *testing.T) {
	server := newTestServerHelper(t)
	req := httptest.NewRequest(http.MethodPost, "/api/memory/re-embed", nil)
	rr := httptest.NewRecorder()
	server.Handler().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("re-embed: expected 200, got %d", rr.Code)
	}

	var result map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("re-embed: invalid JSON: %v", err)
	}
	if result["success"] != true {
		t.Errorf("re-embed: expected success=true")
	}
}

func TestMigrateScratchpadIntegration(t *testing.T) {
	server := newTestServerHelper(t)
	req := httptest.NewRequest(http.MethodPost, "/api/memory/migrate-scratchpad", nil)
	rr := httptest.NewRecorder()
	server.Handler().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("migrate-scratchpad: expected 200, got %d", rr.Code)
	}

	var result map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("migrate-scratchpad: invalid JSON: %v", err)
	}
	if result["success"] != true {
		t.Errorf("migrate-scratchpad: expected success=true")
	}
}