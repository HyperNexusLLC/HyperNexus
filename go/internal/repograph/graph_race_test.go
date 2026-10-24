package repograph

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
)

// Regression test for the "fatal error: concurrent map iteration and map write"
// crash: Build used to publish the Nodes map after pass 1 while pass 2 kept
// writing it, racing concurrent SearchSymbols/FindReferences readers (which
// holds RLock — the writer was the unguarded one). That fatal is unrecoverable
// and killed the entire kernel whenever code search overlapped a rebuild.
//
// Run with: go test -race ./internal/repograph/
func TestBuildConcurrentWithSearches(t *testing.T) {
	root := t.TempDir()
	for i := 0; i < 12; i++ {
		src := fmt.Sprintf("package p%d\n\nfunc Helper%d(x int) int { return x + %d }\n\ntype Type%d struct{ A int }\n", i, i, i, i)
		if err := os.WriteFile(filepath.Join(root, fmt.Sprintf("file%d.go", i)), []byte(src), 0o644); err != nil {
			t.Fatalf("write file: %v", err)
		}
	}

	rgs := NewRepoGraphService(root)
	if _, err := rgs.Build(context.Background()); err != nil {
		t.Fatalf("initial build: %v", err)
	}

	var wg sync.WaitGroup
	stop := make(chan struct{})

	// Readers: hammer the search paths while the graph is rebuilt.
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-stop:
					return
				default:
					rgs.SearchSymbols("helper", 10)
					rgs.FindReferences("file1.go")
				}
			}
		}()
	}

	// Writer: rebuild repeatedly.
	for i := 0; i < 3; i++ {
		if _, err := rgs.Build(context.Background()); err != nil {
			t.Fatalf("concurrent build %d: %v", i, err)
		}
	}

	close(stop)
	wg.Wait()

	if got := rgs.SearchSymbols("helper", 10); len(got) == 0 {
		t.Fatal("expected search results after concurrent rebuilds")
	}
}
