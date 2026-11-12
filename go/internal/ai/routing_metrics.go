package ai

import (
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/metrics"
)

// recordLLMRouting captures a routing decision in the local metrics ring buffer.
// Safe when metrics is uninitialized; never fails the LLM call.
// resp may be nil on error paths; token counts are taken from it when present.
func recordLLMRouting(provider, model, strategy string, start time.Time, resp *LLMResponse, err error) {
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
	if resp != nil {
		ev.TokenInput = resp.Usage.InputTokens
		ev.TokenOutput = resp.Usage.OutputTokens
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
	if ev.TokenInput+ev.TokenOutput > 0 {
		ms.Track("llm_tokens", float64(ev.TokenInput+ev.TokenOutput), map[string]string{
			"provider": provider,
			"model":    model,
		})
	}
}
