package memorystore

import (
	"context"
	"testing"
)

func TestSimpleEmbed(t *testing.T) {
	vec := simpleEmbed("hello world test", 384)
	if len(vec) != 384 {
		t.Errorf("dim = %d, want 384", len(vec))
	}
	var norm float64
	for _, v := range vec {
		norm += float64(v) * float64(v)
	}
	if norm < 0.9 || norm > 1.1 {
		t.Errorf("norm = %f, want ≈ 1.0", norm)
	}
	vec2 := simpleEmbed("hello world test", 384)
	for i := range vec {
		if vec[i] != vec2[i] {
			t.Errorf("not deterministic at dim %d", i)
			break
		}
	}
}

func TestSimpleEmbedDifferent(t *testing.T) {
	a := simpleEmbed("kernel port 7778", 384)
	b := simpleEmbed("dashboard port 7779", 384)
	// Should be somewhat similar (shared "port") but not identical
	same := true
	for i := range a {
		if a[i] != b[i] {
			same = false
			break
		}
	}
	if same {
		t.Error("different texts produced identical embeddings")
	}
}

func TestOllamaEmbed(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping Ollama integration test in short mode")
	}

	ctx := context.Background()
	vec := ollamaEmbed(ctx, "Hello world test embedding")
	if vec == nil {
		t.Skip("Ollama not running — skipping (this is expected in CI)")
	}
	if len(vec) != 768 {
		t.Errorf("Ollama embedding dim = %d, want 768", len(vec))
	}

	// Verify it's L2-normalized
	var norm float64
	for _, v := range vec {
		norm += float64(v) * float64(v)
	}
	if norm < 0.9 || norm > 1.1 {
		t.Errorf("Ollama embedding norm = %f, want ≈ 1.0", norm)
	}

	// Verify semantically similar texts are closer than dissimilar ones
	vecSimilar := ollamaEmbed(ctx, "Hello world test text")
	vecDifferent := ollamaEmbed(ctx, "The capital of France is Paris")
	if vecSimilar == nil || vecDifferent == nil {
		t.Fatal("Ollama returned nil for second/third call")
	}

	simNear := cosineSim(vec, vecSimilar)
	simFar := cosineSim(vec, vecDifferent)
	if simNear <= simFar {
		t.Errorf("expected similar text closer: simNear=%f, simFar=%f", simNear, simFar)
	}
}
