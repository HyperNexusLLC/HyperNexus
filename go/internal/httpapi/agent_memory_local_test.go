package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/config"
)

// The agent-memory store (.hypernexus/agent_memory/memories.json) is rewritten
// on every mutation and read concurrently. These tests lock in the two
// durability guarantees added in v1.0.17:
//   1. writes are atomic (temp file + rename; readers never see torn JSON)
//   2. the loader self-heals legacy/torn corruption instead of 503ing

func writeAgentMemoryFile(t *testing.T, workspaceRoot, raw string) string {
	t.Helper()
	dir := filepath.Join(workspaceRoot, ".hypernexus", "agent_memory")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	path := filepath.Join(dir, "memories.json")
	if err := os.WriteFile(path, []byte(raw), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	return path
}

func TestSalvageAgentMemorySnapshotMergesTornDocuments(t *testing.T) {
	a := `{"version":1,"memories":[{"id":"m1","content":"first","type":"working","namespace":"project"}],"savedAt":"2026-10-20T00:00:00Z"}`
	b := `{"version":1,"memories":[{"id":"m2","content":"second","type":"working","namespace":"project"},{"id":"m1","content":"duplicate","type":"working","namespace":"project"}],"savedAt":"2026-10-20T00:00:01Z"}`
	torn := a + "\n" + b

	snap, err := salvageAgentMemorySnapshot([]byte(torn))
	if err != nil {
		t.Fatalf("salvage failed: %v", err)
	}
	if len(snap.Memories) != 2 {
		t.Fatalf("expected 2 merged memories, got %d", len(snap.Memories))
	}
	if snap.Memories[0].ID != "m1" || snap.Memories[0].Content != "first" {
		t.Fatalf("expected first occurrence of m1 to win, got %+v", snap.Memories[0])
	}
	ids := map[string]bool{}
	for _, m := range snap.Memories {
		if ids[m.ID] {
			t.Fatalf("duplicate id %q survived dedupe", m.ID)
		}
		ids[m.ID] = true
	}
}

func TestSalvageAgentMemorySnapshotRejectsGarbage(t *testing.T) {
	if _, err := salvageAgentMemorySnapshot([]byte("not json at all")); err == nil {
		t.Fatal("expected salvage to fail on pure garbage")
	}
}

func TestAgentMemoryLoaderSelfHealsCorruptFile(t *testing.T) {
	t.Setenv("HYPERNEXUS_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.MainConfigDir = t.TempDir()
	good := `{"version":1,"memories":[{"id":"m1","content":"alpha","type":"working","namespace":"project","metadata":{},"createdAt":"2026-10-20T00:00:00Z","accessedAt":"2026-10-20T00:00:00Z","accessCount":0},{"id":"m2","content":"beta","type":"working","namespace":"project","metadata":{},"createdAt":"2026-10-20T00:00:00Z","accessedAt":"2026-10-20T00:00:00Z","accessCount":0}]}`
	// A legacy torn write: two top-level documents spliced together.
	writeAgentMemoryFile(t, cfg.WorkspaceRoot, good+"\n"+good)

	server := New(cfg, stubDetector{})
	defer server.Close()

	recorder := httptest.NewRecorder()
	server.Handler().ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/agent-memory/stats", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("corrupt store must self-heal to 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"total":2`) {
		t.Fatalf("expected deduped total of 2 salvaged memories, got %s", recorder.Body.String())
	}
}

func TestAgentMemoryWriteIsAtomicAndLeavesNoTempFile(t *testing.T) {
	t.Setenv("HYPERNEXUS_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.MainConfigDir = t.TempDir()
	seedPersistedAgentMemories(t, cfg.WorkspaceRoot)
	server := New(cfg, stubDetector{})
	defer server.Close()

	for i := 0; i < 3; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/memory/facts/add", strings.NewReader(`{"content":"atomic write probe","tags":["test"]}`))
		req.Header.Set("Content-Type", "application/json")
		server.Handler().ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("facts/add expected 200, got %d with body %s", rec.Code, rec.Body.String())
		}
	}

	dir := filepath.Join(cfg.WorkspaceRoot, ".hypernexus", "agent_memory")
	if _, err := os.Stat(filepath.Join(dir, "memories.json.tmp")); !os.IsNotExist(err) {
		t.Fatalf("temp write must be renamed away, .tmp still present (err=%v)", err)
	}

	raw, err := os.ReadFile(filepath.Join(dir, "memories.json"))
	if err != nil {
		t.Fatalf("read store: %v", err)
	}
	var snap localAgentMemorySnapshot
	if err := json.Unmarshal(raw, &snap); err != nil {
		t.Fatalf("store must remain valid JSON after concurrent-style writes: %v", err)
	}
	found := 0
	for _, m := range snap.Memories {
		if strings.Contains(m.Content, "atomic write probe") {
			found++
		}
	}
	if found != 3 {
		t.Fatalf("expected 3 probe records, got %d", found)
	}
}

func TestAgentMemoryDeleteSurvivesCorruptThenRecovers(t *testing.T) {
	t.Setenv("HYPERNEXUS_TRPC_UPSTREAM", "http://127.0.0.1:1/trpc")

	cfg := config.Default()
	cfg.WorkspaceRoot = t.TempDir()
	cfg.MainConfigDir = t.TempDir()
	seedPersistedAgentMemories(t, cfg.WorkspaceRoot)
	path := writeAgentMemoryFile(t, cfg.WorkspaceRoot, `{"version":1,"memories":[{"id":"gone","content":"delete me","type":"working","namespace":"project","metadata":{},"createdAt":"2026-10-20T00:00:00Z","accessedAt":"2026-10-20T00:00:00Z","accessCount":0}]}`)

	server := New(cfg, stubDetector{})
	defer server.Close()

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/agent-memory/delete", strings.NewReader(`{"id":"gone"}`))
	req.Header.Set("Content-Type", "application/json")
	server.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("delete expected 200, got %d with body %s", rec.Code, rec.Body.String())
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read store: %v", err)
	}
	if strings.Contains(string(raw), `"gone"`) {
		t.Fatal("deleted record still present in store")
	}
	var snap localAgentMemorySnapshot
	if err := json.Unmarshal(raw, &snap); err != nil {
		t.Fatalf("store invalid after delete: %v", err)
	}
}
