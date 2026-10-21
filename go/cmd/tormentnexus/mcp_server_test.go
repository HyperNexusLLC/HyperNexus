package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

// registryPayload is the upstream /api/mcp/tools response shape (flat).
func registryPayload(tools []ToolDefinition) []byte {
	body, _ := json.Marshal(map[string]any{"success": true, "data": tools})
	return body
}

func upstreamTool(name string, props ...string) ToolDefinition {
	schema := InputSchema{Type: "object", Properties: map[string]PropertySchema{}}
	for _, p := range props {
		schema.Properties[p] = PropertySchema{Type: "string"}
	}
	return ToolDefinition{Name: name, Description: "upstream " + name, InputSchema: schema}
}

// TestGetMergedToolsFetchesAndCaches: the first tools/list fetches upstream once;
// calls within the TTL are served from the last-good cache without refetching.
func TestGetMergedToolsFetchesAndCaches(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.Write(registryPayload([]ToolDefinition{upstreamTool("upstream_only", "query")}))
	}))
	defer srv.Close()

	s := NewMCPServer(srv.URL)
	first := s.getMergedTools()
	if atomic.LoadInt32(&calls) != 1 {
		t.Fatalf("expected exactly 1 upstream fetch on first call, got %d", calls)
	}
	second := s.getMergedTools()
	if atomic.LoadInt32(&calls) != 1 {
		t.Fatalf("expected cache hit (still 1 fetch) within TTL, got %d", calls)
	}
	if len(first) != len(second) {
		t.Fatalf("cached list length drifted: %d vs %d", len(first), len(second))
	}
	if !hasTool(first, "upstream_only") {
		t.Fatalf("merged list missing upstream tool")
	}
}

// TestGetMergedToolsServesLastGoodOnUpstreamFailure: once a good inventory has
// been seen, a later upstream failure must serve the stale cache rather than
// degrading to the smaller static fallback (the original bug).
func TestGetMergedToolsServesLastGoodOnUpstreamFailure(t *testing.T) {
	var fail atomic.Bool
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		if fail.Load() {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Write(registryPayload([]ToolDefinition{
			upstreamTool("upstream_a", "query"),
			upstreamTool("upstream_b", "query"),
		}))
	}))
	defer srv.Close()

	s := NewMCPServer(srv.URL)
	good := s.getMergedTools()
	goodLen := len(good)

	// Force cache expiry and break upstream: fetch + retry both fail.
	fail.Store(true)
	s.mergedMu.Lock()
	s.mergedAt = time.Now().Add(-time.Hour)
	s.mergedMu.Unlock()

	degraded := s.getMergedTools()
	if len(degraded) != goodLen {
		t.Fatalf("expected last-good list of %d tools, got %d (degraded to static fallback?)", goodLen, len(degraded))
	}
	if !hasTool(degraded, "upstream_a") {
		t.Fatalf("last-good list lost upstream tools")
	}
	if got := atomic.LoadInt32(&calls); got != 3 {
		t.Fatalf("expected 1 success + 1 retry-pair = 3 fetch attempts, got %d", got)
	}
}

// TestGetMergedToolsStaticFallbackWhenNoCacheAndUpstreamDown: with no cache and a
// dead upstream the static list is served (never zero, never a panic).
func TestGetMergedToolsStaticFallbackWhenNoCacheAndUpstreamDown(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer srv.Close()

	s := NewMCPServer(srv.URL)
	list := s.getMergedTools()
	if len(list) != len(s.tools) {
		t.Fatalf("expected static fallback of %d tools, got %d", len(s.tools), len(list))
	}
	if len(list) == 0 {
		t.Fatalf("static fallback must never be empty")
	}
}

// TestGetMergedToolsSchemaOverrideOnCollision: on name collision the strictly
// richer upstream schema/description wins (local-first shadowing left tools
// advertising empty schemas, unusable for model callers).
func TestGetMergedToolsSchemaOverrideOnCollision(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write(registryPayload([]ToolDefinition{
			// hello_world collides with the local static entry.
			{Name: "hello_world", Description: "upstream hello", InputSchema: InputSchema{Type: "object", Properties: map[string]PropertySchema{"name": {Type: "string"}}}},
			// Richer local (if any) must NOT be clobbered by a poorer upstream entry.
			{Name: "memory_scratchpad_get", Description: "upstream poor", InputSchema: InputSchema{Type: "object", Properties: map[string]PropertySchema{}}},
		}))
	}))
	defer srv.Close()

	s := NewMCPServer(srv.URL)
	merged := s.getMergedTools()
	hello := findTool(merged, "hello_world")
	if hello == nil {
		t.Fatalf("hello_world missing from merged list")
	}
	if _, ok := hello.InputSchema.Properties["name"]; !ok {
		t.Fatalf("expected upstream schema to override empty local schema, got props=%v", hello.InputSchema.Properties)
	}
	if hello.Description != "upstream hello" {
		t.Fatalf("expected upstream description to win on collision, got %q", hello.Description)
	}
	scratch := findTool(merged, "memory_scratchpad_get")
	if scratch == nil {
		t.Fatalf("memory_scratchpad_get missing from merged list")
	}
	if _, ok := scratch.InputSchema.Properties["key"]; !ok {
		t.Fatalf("poorer upstream schema must not clobber richer local schema, got props=%v", scratch.InputSchema.Properties)
	}
}

func hasTool(list []ToolDefinition, name string) bool {
	return findTool(list, name) != nil
}

func findTool(list []ToolDefinition, name string) *ToolDefinition {
	for i := range list {
		if list[i].Name == name {
			return &list[i]
		}
	}
	return nil
}
