package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/config"
)

func BenchmarkHealthEndpoint(b *testing.B) {
	cfg := config.Default()
	cfg.WorkspaceRoot = b.TempDir()
	cfg.ConfigDir = b.TempDir()
	cfg.MainConfigDir = b.TempDir()
	server := New(cfg, stubDetector{})
	defer server.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		server.Handler().ServeHTTP(rec, req)
	}
}

func BenchmarkVersionEndpoint(b *testing.B) {
	cfg := config.Default()
	cfg.WorkspaceRoot = b.TempDir()
	cfg.ConfigDir = b.TempDir()
	cfg.MainConfigDir = b.TempDir()
	server := New(cfg, stubDetector{})
	defer server.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/version", nil)
		server.Handler().ServeHTTP(rec, req)
	}
}

func BenchmarkAPIIndex(b *testing.B) {
	cfg := config.Default()
	cfg.WorkspaceRoot = b.TempDir()
	cfg.ConfigDir = b.TempDir()
	cfg.MainConfigDir = b.TempDir()
	server := New(cfg, stubDetector{})
	defer server.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/index", nil)
		server.Handler().ServeHTTP(rec, req)
	}
}

func BenchmarkMCPStatus(b *testing.B) {
	cfg := config.Default()
	cfg.WorkspaceRoot = b.TempDir()
	cfg.ConfigDir = b.TempDir()
	cfg.MainConfigDir = b.TempDir()
	server := New(cfg, stubDetector{})
	defer server.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/mcp/status", nil)
		server.Handler().ServeHTTP(rec, req)
	}
}

func BenchmarkSystemOverview(b *testing.B) {
	cfg := config.Default()
	cfg.WorkspaceRoot = b.TempDir()
	cfg.ConfigDir = b.TempDir()
	cfg.MainConfigDir = b.TempDir()
	server := New(cfg, stubDetector{})
	defer server.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/system/overview", nil)
		server.Handler().ServeHTTP(rec, req)
	}
}

func BenchmarkMemorySearch(b *testing.B) {
	cfg := config.Default()
	cfg.WorkspaceRoot = b.TempDir()
	cfg.ConfigDir = b.TempDir()
	cfg.MainConfigDir = b.TempDir()
	server := New(cfg, stubDetector{})
	defer server.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/memory/search?query=test&limit=10", nil)
		server.Handler().ServeHTTP(rec, req)
	}
}

func BenchmarkGitStatus(b *testing.B) {
	cfg := config.Default()
	cfg.WorkspaceRoot = b.TempDir()
	cfg.ConfigDir = b.TempDir()
	cfg.MainConfigDir = b.TempDir()
	server := New(cfg, stubDetector{})
	defer server.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/git/status", nil)
		server.Handler().ServeHTTP(rec, req)
	}
}

func BenchmarkSessionContext(b *testing.B) {
	cfg := config.Default()
	cfg.WorkspaceRoot = b.TempDir()
	cfg.ConfigDir = b.TempDir()
	cfg.MainConfigDir = b.TempDir()
	server := New(cfg, stubDetector{})
	defer server.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/sessions/context", nil)
		server.Handler().ServeHTTP(rec, req)
	}
}

func BenchmarkJSONEncoding(b *testing.B) {
	data := map[string]any{
		"success": true,
		"data": map[string]any{
			"status":    "ok",
			"version":   "1.0.3",
			"routes":    make([]string, 554),
			"servers":   make([]string, 67),
			"tools":     make([]string, 4500),
			"timestamp": 1234567890,
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = json.Marshal(data)
	}
}
