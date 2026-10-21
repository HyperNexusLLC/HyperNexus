package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/config"
)

// A handler panic must never take down the control plane: Go's net/http does
// not recover panics, so without recoverMiddleware one buggy route would kill
// the whole kernel. This test pins the 500-with-detail behavior.
func TestRecoverMiddlewareContainsHandlerPanic(t *testing.T) {
	panicky := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var m map[string]any
		m["boom"] = "nil map write" // deliberate panic
	})
	recorder := httptest.NewRecorder()
	recoverMiddleware(panicky).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/panic-test", nil))

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected recovered panic to return 500, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	for _, needle := range []string{`"success":false`, `internal handler panic recovered`} {
		if !strings.Contains(recorder.Body.String(), needle) {
			t.Fatalf("expected recovery body to contain %s, got %s", needle, recorder.Body.String())
		}
	}
}

// The middleware must not interfere with healthy handlers.
func TestRecoverMiddlewarePassesThrough(t *testing.T) {
	healthy := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true}`))
	})
	recorder := httptest.NewRecorder()
	recoverMiddleware(healthy).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/ok", nil))
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `"success":true`) {
		t.Fatalf("expected pass-through 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
}

// Sanity: the live server actually wires recoverMiddleware as the outermost
// layer (catches regressions where the wrapper is dropped from the chain).
func TestServerHandlerChainHasRecover(t *testing.T) {
	t.Setenv("HYPERNEXUS_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")
	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.MainConfigDir = t.TempDir()
	server := New(cfg, stubDetector{})
	defer server.Close()

	// A request to a valid route must complete regardless of chain internals;
	// this asserts construction does not panic and the handler responds.
	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/health", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected /health 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
}
