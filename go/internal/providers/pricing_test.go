package providers

import (
	"math"
	"testing"
)

func TestEstimateCostUSD(t *testing.T) {
	// gpt-4o: $0.0025/1k in, $0.01/1k out
	cost := EstimateCostUSD("gpt-4o", 1000, 1000)
	if math.Abs(cost-0.0125) > 1e-9 {
		t.Fatalf("expected 0.0125, got %v", cost)
	}

	// Prefix match for dated snapshot names
	cost = EstimateCostUSD("claude-3-7-sonnet-20250219", 1000, 0)
	if math.Abs(cost-0.003) > 1e-9 {
		t.Fatalf("expected 0.003, got %v", cost)
	}

	// Unknown model is free (not fatal)
	if EstimateCostUSD("totally-unknown-model", 1000, 1000) != 0 {
		t.Fatalf("expected 0 for unknown model")
	}

	in, out, ok := ModelPricePer1k("gpt-4o-mini")
	if !ok || in != 0.00015 || out != 0.0006 {
		t.Fatalf("unexpected gpt-4o-mini price: %v %v %v", in, out, ok)
	}
}
