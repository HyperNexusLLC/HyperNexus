package memorystore

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// OllamaChat calls Ollama /api/generate for general text generation.
// Used as a local fallback when cloud AutoRoute is unavailable.
func OllamaChat(ctx context.Context, prompt string) (string, error) {
	return ollamaGenerate(ctx, prompt)
}

// OllamaChatWithSystem calls Ollama with a system+user prompt pair.
func OllamaChatWithSystem(ctx context.Context, system, user string) (string, error) {
	return ollamaGenerate(ctx, system+"\n\n"+user)
}

// ollamaChatRaw is available for callers that need the raw Ollama endpoint.
func ollamaChatRaw(ctx context.Context, model, prompt string) (string, error) {
	payload := struct {
		Model  string `json:"model"`
		Prompt string `json:"prompt"`
		Stream bool   `json:"stream"`
	}{Model: model, Prompt: prompt, Stream: false}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "http://localhost:11434/api/generate", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("ollama generate: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("ollama generate: status %d", resp.StatusCode)
	}

	var result struct {
		Response string `json:"response"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.Response, nil
}
