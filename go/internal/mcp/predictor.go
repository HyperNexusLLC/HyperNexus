package mcp

/**
 * @file predictor.go
 * @module go/internal/mcp
 *
 * WHAT: Go-native implementation of autonomous tool prediction.
 *
 * WHY: Total Autonomy — TN Kernel should be able to suggest relevant tools
 * independently of the Node control plane.
 */

import (
	"context"
	"fmt"
	"strings"
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/ai"
)

type ToolPredictor struct {
	aggregator *Aggregator
}

func NewToolPredictor(agg *Aggregator) *ToolPredictor {
	return &ToolPredictor{aggregator: agg}
}

func (p *ToolPredictor) PredictAndPreload(ctx context.Context, chatHistory string, activeGoal string) ([]string, error) {
	topics, err := p.identifyTopics(ctx, chatHistory, activeGoal)
	if err != nil {
		return nil, err
	}

	var predictedTools []string
	for _, topic := range topics {
		// Use native ranking logic
		tools, _ := p.aggregator.ListTools(ctx)
		ranked := RankTools(topic, tools, 2)
		for _, r := range ranked {
			predictedTools = append(predictedTools, r.Name)
		}
	}

	return uniqueStrings(predictedTools), nil
}

func (p *ToolPredictor) identifyTopics(ctx context.Context, chatHistory string, activeGoal string) ([]string, error) {
	prompt := fmt.Sprintf(`
		You are the HyperNexus Supervisor Tool Predictor (Go Native).
		Analyze the following conversation and active goal. 
		Identify 3-5 specific technical topics or capabilities that the AI will likely need next.
		Focus on things that might require specialized MCP tools.

		GOAL: %s
		HISTORY: %s
		
		Return ONLY a comma-separated list of keywords.
	`, activeGoal, chatHistory)

	// Bound the LLM call with a hard goroutine timeout: a hung Ollama (or any
	// provider that ignores context) must not stall the prediction loop.
	type llmResult struct {
		resp *ai.LLMResponse
		err  error
	}
	llmCh := make(chan llmResult, 1)
	go func() {
		defer func() {
			if rec := recover(); rec != nil {
				llmCh <- llmResult{nil, fmt.Errorf("LLM panic: %v", rec)}
			}
		}()
		llmCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		r, e := ai.AutoRoute(llmCtx, []ai.Message{
			{Role: "user", Content: prompt},
		})
		llmCh <- llmResult{r, e}
	}()
	var resp *ai.LLMResponse
	var err error
	select {
	case lr := <-llmCh:
		resp, err = lr.resp, lr.err
	case <-time.After(4 * time.Second):
		err = fmt.Errorf("LLM call timed out after 4s")
	case <-ctx.Done():
		err = ctx.Err()
	}
	if err == nil && resp != nil && resp.Content != "" {
		parts := strings.Split(resp.Content, ",")
		var result []string
		for _, part := range parts {
			trimmed := strings.TrimSpace(strings.ToLower(part))
			if trimmed != "" {
				result = append(result, trimmed)
			}
		}
		if len(result) > 0 {
			return result, nil
		}
	}

	// LLM unavailable or returned nothing — fall back to keyword-frequency
	// topic extraction so the predictor always produces useful suggestions.
	return extractTopicsFromText(chatHistory + " " + activeGoal), nil
}

// extractTopicsFromText pulls frequent keywords and bigrams from free text.
// Used as a no-LLM fallback so tool prediction works even when Ollama is down.
func extractTopicsFromText(text string) []string {
	words := strings.Fields(strings.ToLower(text))
	freq := make(map[string]int)
	for _, w := range words {
		w = strings.Trim(w, ".,!?;:()[]{}\"'")
		if len(w) > 3 {
			freq[w]++
		}
	}
	// Bigrams
	bigrams := make(map[string]int)
	for i := 0; i < len(words)-1; i++ {
		w1 := strings.Trim(strings.ToLower(words[i]), ".,!?;:()[]{}\"'")
		w2 := strings.Trim(strings.ToLower(words[i+1]), ".,!?;:()[]{}\"'")
		if len(w1) > 2 && len(w2) > 2 {
			bigrams[w1+" "+w2]++
		}
	}

	type scored struct {
		topic string
		count int
	}
	var all []scored
	for t, c := range freq {
		if c >= 1 {
			all = append(all, scored{t, c})
		}
	}
	for t, c := range bigrams {
		if c >= 2 {
			all = append(all, scored{t, c})
		}
	}
	// Sort descending by count
	for i := 0; i < len(all); i++ {
		for j := i + 1; j < len(all); j++ {
			if all[j].count > all[i].count {
				all[i], all[j] = all[j], all[i]
			}
		}
	}
	var topics []string
	for i, s := range all {
		if i >= 5 {
			break
		}
		topics = append(topics, s.topic)
	}
	return topics
}

func uniqueStrings(input []string) []string {
	seen := make(map[string]struct{})
	var result []string
	for _, s := range input {
		if _, ok := seen[s]; !ok {
			seen[s] = struct{}{}
			result = append(result, s)
		}
	}
	return result
}
