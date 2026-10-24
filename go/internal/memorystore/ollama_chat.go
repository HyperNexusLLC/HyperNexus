package memorystore

import (
	"context"
	"errors"
)

// OllamaChat previously routed text generation through a local Ollama server.
// Ollama has been removed in favor of the bundled ONNX embedding model; text
// generation is now handled exclusively by the configured LLM (ai.AutoRoute).
// These stubs remain so callers degrade gracefully instead of failing to build.
func OllamaChat(_ context.Context, _ string) (string, error) {
	return "", errors.New("ollama removed: use ai.AutoRoute for text generation")
}

// OllamaChatWithSystem previously called Ollama with a system+user prompt pair.
func OllamaChatWithSystem(_ context.Context, _, _ string) (string, error) {
	return "", errors.New("ollama removed: use ai.AutoRoute for text generation")
}
