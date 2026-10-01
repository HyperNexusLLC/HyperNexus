package memorystore

import (
	"context"
	"path/filepath"
	"testing"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/controlplane"
)

func TestExportImportRoundTrip(t *testing.T) {
	dir := t.TempDir()
	vs, err := NewVectorStore(filepath.Join(dir, "mem.db"))
	if err != nil {
		t.Fatalf("NewVectorStore: %v", err)
	}
	defer vs.Close()

	ctx := context.Background()
	distinct := []string{
		"Ollama nomic-embed-text produces 768-dim vectors",
		"Hetzner kernel listens on port 7778",
		"VectorStore exports JSON bundles for backup",
		"Nginx proxies /kernel-dashboard to 7778",
		"GraphRAG edges link dependent memories",
	}
	for i, content := range distinct {
		rec := controlplane.L2VaultRecord{
			ID:        "mem-" + string(rune('a'+i)),
			SessionID: "test",
			Type:      "working",
			Kind:      "long_term",
			Category:  "semantic",
			Content:   content,
		}
		if err := vs.Commit(ctx, rec); err != nil {
			t.Fatalf("Commit %d: %v", i, err)
		}
	}

	export, err := vs.ExportMemoriesJSON(ctx)
	if err != nil {
		t.Fatalf("ExportMemoriesJSON: %v", err)
	}
	if export.Count < 5 {
		t.Fatalf("expected >=5 exported, got %d", export.Count)
	}

	imported, errs, err := vs.ImportMemoriesJSON(ctx, export)
	if err != nil {
		t.Fatalf("ImportMemoriesJSON: %v", err)
	}
	if imported != export.Count {
		t.Fatalf("imported=%d want %d errs=%v", imported, export.Count, errs)
	}

	export2, err := vs.ExportMemoriesJSON(ctx)
	if err != nil {
		t.Fatalf("re-export: %v", err)
	}
	if export2.Count != export.Count {
		t.Fatalf("round-trip count changed: %d -> %d", export.Count, export2.Count)
	}
}

func TestCommitUpsertDoesNotCascadeSupersede(t *testing.T) {
	dir := t.TempDir()
	vs, err := NewVectorStore(filepath.Join(dir, "mem.db"))
	if err != nil {
		t.Fatalf("NewVectorStore: %v", err)
	}
	defer vs.Close()

	ctx := context.Background()
	a := controlplane.L2VaultRecord{ID: "mem-a", SessionID: "s", Type: "working", Kind: "long_term", Content: "Alpha service uses Ollama embeddings"}
	b := controlplane.L2VaultRecord{ID: "mem-b", SessionID: "s", Type: "working", Kind: "long_term", Content: "Alpha service uses Ollama embeddings"}
	if err := vs.Commit(ctx, a); err != nil {
		t.Fatalf("commit a: %v", err)
	}
	if err := vs.Commit(ctx, b); err != nil {
		t.Fatalf("commit b: %v", err)
	}

	if err := vs.Commit(ctx, a); err != nil {
		t.Fatalf("re-commit a: %v", err)
	}

	export, err := vs.ExportMemoriesJSON(ctx)
	if err != nil {
		t.Fatalf("export: %v", err)
	}
	if export.Count != 2 {
		t.Fatalf("expected 2 live records after upsert, got %d", export.Count)
	}
}

func TestIsContradictionStrict(t *testing.T) {
	if isContradiction("Ollama is running on port 11434", "HyperNexus uses VectorStore for L2 memories") {
		t.Fatal("distinct facts flagged as contradiction")
	}
	if !isContradiction("same text here", "same text here") {
		t.Fatal("exact duplicate not flagged")
	}
	if !isContradiction("the service is enabled and works", "the service is not enabled and works") {
		t.Fatal("polarity flip not flagged")
	}
}

func TestRelationCleanupHashedIDs(t *testing.T) {
	dir := t.TempDir()
	vs, err := NewVectorStore(filepath.Join(dir, "mem.db"))
	if err != nil {
		t.Fatalf("NewVectorStore: %v", err)
	}
	defer vs.Close()
	ctx := context.Background()

	if err := vs.AddRelation(ctx, "ent-01909f8c", "ent-1d9438a3", "uses", 0.5); err != nil {
		t.Fatalf("add hash rel: %v", err)
	}
	if err := vs.AddRelation(ctx, "mem-a", "ent-ollama", "uses", 0.8); err != nil {
		t.Fatalf("add slug rel: %v", err)
	}

	rewritten, removed, err := vs.CleanupHashedEntityIDs(ctx)
	if err != nil {
		t.Fatalf("cleanup: %v", err)
	}
	if removed < 1 {
		t.Fatalf("expected hashed pair removed, got rewritten=%d removed=%d", rewritten, removed)
	}

	rels, err := vs.ListAllRelations(ctx, 50)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	for _, r := range rels {
		if isHashedEntID(r.SourceID) || isHashedEntID(r.TargetID) {
			t.Fatalf("hashed id survived cleanup: %+v", r)
		}
	}
}
