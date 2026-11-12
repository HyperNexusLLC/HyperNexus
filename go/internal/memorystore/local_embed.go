package memorystore

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"

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
	localEmbedTried = false
	localEmbedErr = nil
}
