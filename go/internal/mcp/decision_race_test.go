package mcp

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
)

// Regression test for the kernel-fatal "concurrent map read and map write" in
// DecisionSystem.SearchTools: it read ds.loaded (the IsLoaded flag) WITHOUT
// holding ds.mu while LoadTool/UnloadTool/eviction/rebuildKnownLocked write it
// under lock. Same fatal class as the PreemptiveAdvertiser cooldown race: an
// unlocked map read racing a locked write kills the process. SearchTools and
// LoadTool are hit concurrently in production whenever the MCP router serves
// search_and_call while tool calls load/unload tools (battery sweeps, plugin
// storms).
//
// NOTE: a regression makes the TEST PROCESS die with a runtime fatal (not a
// recoverable panic) -- that is exactly the signal we want.
func TestDecisionSystemConcurrentSearchAndLoad(t *testing.T) {
	ds := NewDecisionSystem(DecisionConfig{}, nil)
	ds.AddCatalogEntries(BuiltinTools())

	var names []string
	for _, tool := range BuiltinTools() {
		names = append(names, tool.AdvertisedName)
	}
	if len(names) == 0 {
		t.Fatal("BuiltinTools returned no tools")
	}

	var wg sync.WaitGroup
	stop := make(chan struct{})
	var resultCount int64

	// Searchers: hammer SearchTools (the formerly-unguarded read path).
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-stop:
					return
				default:
					res, _ := ds.SearchTools(context.Background(), "bash search memory file read write shell")
					atomic.AddInt64(&resultCount, int64(len(res)))
				}
			}
		}()
	}

	// Loaders/unloaders: the writers of ds.loaded (LoadTool also triggers
	// evictIfNeededLocked map writes once past the soft cap).
	for i := 0; i < 3; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			for j := 0; j < 30; j++ {
				name := names[(j+n*7)%len(names)]
				ds.LoadTool(context.Background(), name)
				if j%2 == 0 {
					ds.UnloadTool(name)
				}
			}
		}(i)
	}

	// Main hammers too, then winds down.
	for i := 0; i < 100; i++ {
		res, _ := ds.SearchTools(context.Background(), "bash search memory file read write shell")
		atomic.AddInt64(&resultCount, int64(len(res)))
	}
	close(stop)
	wg.Wait()

	if atomic.LoadInt64(&resultCount) == 0 {
		t.Fatal("expected search results so the ds.loaded read path is exercised")
	}
}
