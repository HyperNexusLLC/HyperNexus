package mcp

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"
)

// Regression test for the kernel-fatal "concurrent map read and map write" in
// PreemptiveAdvertiser: GetAdvertisements read pa.injected (cooldown filter)
// WITHOUT holding pa.mu while concurrent GetAdvertisements/OnMessage calls
// wrote it. Map reads racing writes are fatal even when the writer locks --
// the reader must lock too. This raced constantly in production because the
// OpenCode plugin's session hooks fire tool-suggestion GETs and feed POSTs
// concurrently.
//
// NOTE: a regression makes the TEST PROCESS die with a runtime fatal (not a
// recoverable panic) -- that is exactly the signal we want.
func TestPreemptiveAdvertiserConcurrentSuggestions(t *testing.T) {
	ds := NewDecisionSystem(DecisionConfig{}, nil)
	ds.AddCatalogEntries(BuiltinTools())
	// Zero cooldown: the first call marks ads injected, and with the production
	// 30s cooldown every later call is filtered out -- on a loaded box the main
	// goroutine can starve the readers through all its calls first and the
	// coverage counter would stay zero (a scheduling lottery). Cooldown 0 keeps
	// the pa.injected map READ on every call (race coverage intact) while
	// making the count deterministic.
	cfg := DefaultAdvertiseConfig()
	cfg.Cooldown = 0
	pa := NewPreemptiveAdvertiser(ds, cfg)

	// Seed conversation history with words that rank builtin tools highly.
	for i := 0; i < 8; i++ {
		pa.OnMessage(ConversationMessage{Role: "user", Content: "bash shell search read write memory file system tools please", Timestamp: time.Now()})
	}

	var wg sync.WaitGroup
	stop := make(chan struct{})

	// Concurrent readers (the racy path).
	var totalAds int
	var adsMu sync.Mutex
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-stop:
					return
				default:
					ads := pa.GetAdvertisements(context.Background())
					adsMu.Lock()
					totalAds += len(ads)
					adsMu.Unlock()
				}
			}
		}()
	}

	// Concurrent message feeders (writers on history/injected).
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			for j := 0; j < 40; j++ {
				pa.OnMessage(ConversationMessage{Role: "user", Content: fmt.Sprintf("bash search memory probe %d", j), Timestamp: time.Now()})
			}
		}(i)
	}

	// Let the readers hammer while feeds run, then wind down. Count these too:
	// coverage must not depend on which goroutine wins the first call.
	for i := 0; i < 200; i++ {
		ads := pa.GetAdvertisements(context.Background())
		adsMu.Lock()
		totalAds += len(ads)
		adsMu.Unlock()
	}
	close(stop)
	wg.Wait()

	if totalAds == 0 {
		t.Fatal("expected at least one advertisement so the cooldown filter path is exercised")
	}
}
