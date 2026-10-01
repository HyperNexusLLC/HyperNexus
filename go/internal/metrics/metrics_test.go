package metrics

import (
	"os"
	"path/filepath"
	"testing"
)

func TestProviderBreakdownAggregatesRoutingHistory(t *testing.T) {
	ms := NewMetricsService()
	ms.RecordRouting(RoutingEvent{Provider: "OpenAI", Model: "gpt-4o", ToolName: "codebase_search", LatencyMs: 120, Success: true, TokenInput: 100, TokenOutput: 50})
	ms.RecordRouting(RoutingEvent{Provider: "OpenAI", Model: "gpt-4o-mini", LatencyMs: 80, Success: true, TokenInput: 20, TokenOutput: 10})
	ms.RecordRouting(RoutingEvent{Provider: "OpenAI", Model: "gpt-4o", LatencyMs: 200, Success: false, Error: "timeout"})
	ms.RecordRouting(RoutingEvent{Provider: "Anthropic", Model: "claude-3-7-sonnet-20250219", LatencyMs: 300, Success: true, TokenInput: 40, TokenOutput: 60})

	rows := ms.ProviderBreakdown()
	if len(rows) != 2 {
		t.Fatalf("expected 2 providers, got %d: %+v", len(rows), rows)
	}
	// Sorted by request count desc — OpenAI first.
	openai := rows[0]
	if openai.Provider != "OpenAI" || openai.RequestCount != 3 || openai.SuccessCount != 2 || openai.ErrorCount != 1 {
		t.Fatalf("unexpected OpenAI aggregation: %+v", openai)
	}
	if openai.TokenCount != 180 {
		t.Fatalf("expected OpenAI tokenCount 180, got %d", openai.TokenCount)
	}
	if openai.Status != "degraded" {
		t.Fatalf("expected degraded status after error, got %q", openai.Status)
	}
	if openai.Requests != 3 {
		t.Fatalf("legacy requests field should match requestCount, got %d", openai.Requests)
	}
	if len(openai.Models) != 2 || openai.Models[0] != "gpt-4o" || openai.Models[1] != "gpt-4o-mini" {
		t.Fatalf("unexpected models: %v", openai.Models)
	}
	if openai.LastUsedAt == 0 {
		t.Fatalf("expected lastUsedAt to be set")
	}
	anthropic := rows[1]
	if anthropic.Provider != "Anthropic" || anthropic.RequestCount != 1 || anthropic.AvgLatencyMs != 300 {
		t.Fatalf("unexpected Anthropic aggregation: %+v", anthropic)
	}
	if anthropic.TokenCount != 100 {
		t.Fatalf("expected Anthropic tokenCount 100, got %d", anthropic.TokenCount)
	}
}

func TestRoutingHistoryPersistsAcrossReload(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "routing-history.json")

	first := NewMetricsService()
	first.SetRoutingPersistence(path)
	first.RecordRouting(RoutingEvent{Provider: "OpenAI", Model: "gpt-4o", ToolName: "search", LatencyMs: 42, Success: true})
	first.RecordRouting(RoutingEvent{Provider: "Anthropic", Model: "claude", ToolName: "plan", LatencyMs: 99, Success: false, Error: "boom"})

	if _, err := os.Stat(path); err != nil {
		t.Fatalf("expected routing history file to exist: %v", err)
	}

	second := NewMetricsService()
	second.SetRoutingPersistence(path)
	history := second.GetRoutingHistory(10)
	if len(history) != 2 {
		t.Fatalf("expected 2 restored events, got %d", len(history))
	}
	// Newest first.
	if history[0].Provider != "Anthropic" || history[1].Provider != "OpenAI" {
		t.Fatalf("unexpected restore order: %+v", history)
	}
	if history[1].LatencyMs != 42 || history[0].Error != "boom" {
		t.Fatalf("restored events lost fields: %+v", history)
	}
}

func TestProviderBreakdownEmpty(t *testing.T) {
	ms := NewMetricsService()
	rows := ms.ProviderBreakdown()
	if len(rows) != 0 {
		t.Fatalf("expected empty breakdown, got %+v", rows)
	}
}
