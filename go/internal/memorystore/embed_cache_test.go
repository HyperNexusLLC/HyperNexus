package memorystore

import (
	"fmt"
	"testing"
	"time"
)

func TestEmbedCacheKeyNormalization(t *testing.T) {
	embedCacheClear()
	embedCachePut(embedCacheKey("  Hello   World "), []float32{1, 2, 3})

	got := embedCacheGet(embedCacheKey("hello world"))
	if len(got) != 3 || got[0] != 1 || got[2] != 3 {
		t.Fatalf("normalized cache lookup failed: %v", got)
	}
}

func TestEmbedCacheReturnsCopies(t *testing.T) {
	embedCacheClear()
	embedCachePut("k", []float32{1, 2})
	got := embedCacheGet("k")
	got[0] = 99
	again := embedCacheGet("k")
	if again[0] != 1 {
		t.Fatalf("cache must return copies, stored value mutated: %v", again)
	}
}

func TestEmbedCacheExpiry(t *testing.T) {
	embedCacheClear()
	embedCachePut("old", []float32{1})
	embedCacheMu.Lock()
	embedCache["old"] = embedCacheEntry{vec: []float32{1}, at: time.Now().Add(-embedCacheTTL - time.Second)}
	embedCacheMu.Unlock()
	if got := embedCacheGet("old"); got != nil {
		t.Fatalf("expired entry must miss, got %v", got)
	}
}

func TestEmbedCacheLRUEviction(t *testing.T) {
	embedCacheClear()
	for i := 0; i < embedCacheMaxEntries+5; i++ {
		embedCachePut(fmt.Sprintf("k%d", i), []float32{float32(i)})
	}
	if got := embedCacheGet("k0"); got != nil {
		t.Fatalf("oldest entry should be evicted, got %v", got)
	}
	if got := embedCacheGet(fmt.Sprintf("k%d", embedCacheMaxEntries+4)); got == nil {
		t.Fatal("newest entry should be present")
	}
	embedCacheClear()
	if got := embedCacheGet("anything"); got != nil {
		t.Fatalf("cleared cache must miss, got %v", got)
	}
}
