package memorystore

import (
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
