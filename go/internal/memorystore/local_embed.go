package memorystore

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/knights-analytics/hugot"
	"github.com/knights-analytics/hugot/pipelines"
)

// localEmbedDim is the output dimension of the bundled all-MiniLM-L6-v2 model.
// It intentionally matches fallbackDim so semantic and hash embeddings share
// the same vector space.
const localEmbedDim = 384

var (
	localEmbedMu      sync.Mutex // serializes pipeline inference (hugot pipelines are not concurrency-safe)
	localEmbedPipe    *pipelines.FeatureExtractionPipeline
	localEmbedSession *hugot.Session
	localEmbedErr     error
	localEmbedTried   bool
)

// Query/content embedding cache: repeated searches for the same text (and
// duplicate memory writes) otherwise pay a full ONNX inference under the
// store mutex on every call. Small LRU + TTL keeps hot embeddings in memory.
const (
	embedCacheMaxEntries = 256
	embedCacheTTL        = 10 * time.Minute
)

type embedCacheEntry struct {
	vec []float32
	at  time.Time
}

var (
	embedCacheMu    sync.Mutex
	embedCache      = map[string]embedCacheEntry{}
	embedCacheOrder []string // LRU order, most-recently-used last
)

func embedCacheKey(text string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(text))), " ")
}

func embedCacheGet(key string) []float32 {
	embedCacheMu.Lock()
	defer embedCacheMu.Unlock()
	e, ok := embedCache[key]
	if !ok {
		return nil
	}
	if time.Since(e.at) > embedCacheTTL {
		delete(embedCache, key)
		return nil
	}
	// Refresh LRU position.
	for i, k := range embedCacheOrder {
		if k == key {
			embedCacheOrder = append(embedCacheOrder[:i], embedCacheOrder[i+1:]...)
			break
		}
	}
	embedCacheOrder = append(embedCacheOrder, key)
	out := make([]float32, len(e.vec))
	copy(out, e.vec)
	return out
}

func embedCachePut(key string, vec []float32) {
	embedCacheMu.Lock()
	defer embedCacheMu.Unlock()
	cp := make([]float32, len(vec))
	copy(cp, vec)
	if _, exists := embedCache[key]; !exists {
		embedCacheOrder = append(embedCacheOrder, key)
	}
	embedCache[key] = embedCacheEntry{vec: cp, at: time.Now()}
	for len(embedCacheOrder) > embedCacheMaxEntries {
		delete(embedCache, embedCacheOrder[0])
		embedCacheOrder = embedCacheOrder[1:]
	}
}

func embedCacheClear() {
	embedCacheMu.Lock()
	defer embedCacheMu.Unlock()
	embedCache = map[string]embedCacheEntry{}
	embedCacheOrder = nil
}

// localEmbedModelPath returns the directory holding model.onnx + tokenizer.json.
// Override with HYPERNEXUS_EMBED_MODEL_PATH for custom deployments.
func localEmbedModelPath() string {
	if p := os.Getenv("HYPERNEXUS_EMBED_MODEL_PATH"); p != "" {
		return p
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".hypernexus", "models", "all-MiniLM-L6-v2")
}

// ensureLocalEmbedder loads the bundled ONNX sentence-transformer once. The
// first caller pays the model-load cost (and runs a warmup embed); later calls
// are cheap. On any failure it records the error and callers fall back to
// simpleEmbed.
func ensureLocalEmbedder() error {
	if localEmbedTried {
		return localEmbedErr
	}
	localEmbedMu.Lock()
	defer localEmbedMu.Unlock()
	if localEmbedTried {
		return localEmbedErr
	}
	localEmbedTried = true

	modelPath := localEmbedModelPath()
	if modelPath == "" {
		localEmbedErr = fmt.Errorf("could not resolve embedding model path")
		return localEmbedErr
	}
	if _, err := os.Stat(filepath.Join(modelPath, "model.onnx")); err != nil {
		localEmbedErr = fmt.Errorf("embedding model not found at %s (run the model downloader): %w", modelPath, err)
		return localEmbedErr
	}

	session, err := hugot.NewGoSession()
	if err != nil {
		localEmbedErr = fmt.Errorf("hugot session: %w", err)
		return localEmbedErr
	}

	config := hugot.FeatureExtractionConfig{
		ModelPath:    modelPath,
		Name:         "tn-embedder",
		OnnxFilename: "model.onnx",
		Options:      []hugot.FeatureExtractionOption{pipelines.WithNormalization()},
	}
	pipe, err := hugot.NewPipeline(session, config)
	if err != nil {
		_ = session.Destroy()
		localEmbedErr = fmt.Errorf("hugot pipeline: %w", err)
		return localEmbedErr
	}

	// Warm up so the first real query does not pay JIT/first-run latency.
	_, _ = pipe.RunPipeline([]string{"warmup"})

	localEmbedPipe = pipe
	localEmbedSession = session
	return nil
}

// localEmbed returns a localEmbedDim semantic embedding for text, or nil when
// the bundled model is unavailable — the caller then falls back to simpleEmbed.
func localEmbed(ctx context.Context, text string) []float32 {
	cacheKey := embedCacheKey(text)
	if cached := embedCacheGet(cacheKey); cached != nil {
		return cached
	}
	if err := ensureLocalEmbedder(); err != nil || localEmbedPipe == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	type result struct {
		vec []float32
		err error
	}
	ch := make(chan result, 1)
	go func() {
		localEmbedMu.Lock()
		defer localEmbedMu.Unlock()
		out, err := localEmbedPipe.RunPipeline([]string{text})
		if err != nil {
			ch <- result{err: err}
			return
		}
		if len(out.Embeddings) == 0 || len(out.Embeddings[0]) == 0 {
			ch <- result{err: fmt.Errorf("empty embedding output")}
			return
		}
		ch <- result{vec: out.Embeddings[0]}
	}()

	select {
	case r := <-ch:
		if r.err != nil || len(r.vec) == 0 {
			return nil
		}
		embedCachePut(cacheKey, r.vec)
		return r.vec
	case <-ctx.Done():
		return nil
	}
}

// closeLocalEmbedder releases the ONNX session (used by tests and shutdown).
// PreloadEmbedder warms the bundled ONNX model in the background at startup so
// the first memory write/search doesn't pay the ~1s model-load + first-inference
// cost. Safe to call multiple times and from a goroutine.
func PreloadEmbedder() {
	_ = ensureLocalEmbedder()
}

func closeLocalEmbedder() {
	localEmbedMu.Lock()
	defer localEmbedMu.Unlock()
	if localEmbedSession != nil {
		_ = localEmbedSession.Destroy()
		localEmbedSession = nil
	}
	localEmbedPipe = nil
	embedCacheClear()
	localEmbedTried = false
	localEmbedErr = nil
}
