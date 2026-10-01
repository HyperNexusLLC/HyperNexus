package ai

import (
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/metrics"
)

// recordLLMRouting captures a routing decision in the local metrics ring buffer.
// Safe when metrics is uninitialized; never fails the LLM call.
func recordLLMRouting(provider, model, strategy string, start time.Time, err error) {
	ms := metrics.GetMetricsService()
	if ms == nil {
		return
	}
	ev := metrics.RoutingEvent{
		Timestamp: time.Now().UnixMilli(),
		Provider:  provider,
		Model:     model,
		Strategy:  strategy,
		LatencyMs: float64(time.Since(start).Milliseconds()),
		Success:   err == nil,
	}
	if err != nil {
		ev.Error = err.Error()
	}
	ms.RecordRouting(ev)
	latency := ev.LatencyMs
	success := 1.0
	if err != nil {
		success = 0
	}
	ms.Track("llm_request", latency, map[string]string{
		"provider": provider,
		"model":    model,
		"strategy": strategy,
		"success":  map[bool]string{true: "true", false: "false"}[err == nil],
	})
	ms.Track("llm_success", success, map[string]string{"provider": provider})
}
