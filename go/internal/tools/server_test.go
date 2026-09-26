package tools

import (
	"context"
	"os"
	"strings"
	"testing"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/memorystore"
)

func TestHandleScratchpadGetSet(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := tmpDir + "/test.db"
	vs, err := memorystore.NewVectorStore(dbPath)
	if err != nil {
		t.Fatalf("NewVectorStore: %v", err)
	}
	defer vs.Close()
	GlobalVectorStore = vs
	defer func() { GlobalVectorStore = nil }()

	ctx := context.Background()

	// Set a value
	_, err = HandleScratchpadSet(ctx, map[string]interface{}{"key": "test", "value": "hello"})
	if err != nil {
		t.Fatalf("Set: %v", err)
	}

	// Get the value
	resp, err := HandleScratchpadGet(ctx, map[string]interface{}{"key": "test"})
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if len(resp.Content) == 0 {
		t.Fatal("Get returned empty content")
	}
	if !strings.Contains(resp.Content[0].Text, "hello") {
		t.Errorf("Get = %q, want containing 'hello'", resp.Content[0].Text)
	}
}

func TestHandleScratchpadAppend(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := tmpDir + "/test.db"
	vs, err := memorystore.NewVectorStore(dbPath)
	if err != nil {
		t.Fatalf("NewVectorStore: %v", err)
	}
	defer vs.Close()
	GlobalVectorStore = vs
	defer func() { GlobalVectorStore = nil }()

	ctx := context.Background()

	HandleScratchpadSet(ctx, map[string]interface{}{"key": "k", "value": "a"})
	HandleScratchpadAppend(ctx, map[string]interface{}{"key": "k", "value": "b"})

	resp, err := HandleScratchpadGet(ctx, map[string]interface{}{"key": "k"})
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	text := resp.Content[0].Text
	if !strings.Contains(text, "a") || !strings.Contains(text, "b") {
		t.Errorf("After append = %q, want 'a' and 'b'", text)
	}
}

func TestHandleScratchpadMissingKey(t *testing.T) {
	_, err := HandleScratchpadGet(context.Background(), map[string]interface{}{})
	if err == nil {
		t.Error("Expected error for missing key")
	}
}

func TestHandleBash(t *testing.T) {
	resp, err := HandleBash(context.Background(), map[string]interface{}{"command": "echo test123"})
	if err != nil {
		t.Fatalf("Bash: %v", err)
	}
	if !strings.Contains(resp.Content[0].Text, "test123") {
		t.Errorf("Bash output = %q, want 'test123'", resp.Content[0].Text)
	}
}

func TestHandleListDir(t *testing.T) {
	resp, err := HandleListDir(context.Background(), map[string]interface{}{"path": ".", "limit": 5})
	if err != nil {
		t.Fatalf("ListDir: %v", err)
	}
	if len(resp.Content) == 0 || resp.Content[0].Text == "" {
		t.Error("ListDir returned empty")
	}
}

func TestHandleReadFile(t *testing.T) {
	// Create a temp file
	tmpFile, _ := os.CreateTemp("", "test-*.txt")
	tmpFile.WriteString("hello world")
	tmpFile.Close()
	defer os.Remove(tmpFile.Name())

	resp, err := HandleReadFile(context.Background(), map[string]interface{}{"path": tmpFile.Name()})
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	if !strings.Contains(resp.Content[0].Text, "hello world") {
		t.Errorf("ReadFile = %q, want 'hello world'", resp.Content[0].Text)
	}
}

func TestHandleEcho(t *testing.T) {
	resp, err := HandleEcho(context.Background(), map[string]interface{}{"message": "ping"})
	if err != nil {
		t.Fatalf("Echo: %v", err)
	}
	if resp.Content[0].Text != "ping" {
		t.Errorf("Echo = %q, want 'ping'", resp.Content[0].Text)
	}
}

func TestHandleHelloWorld(t *testing.T) {
	resp, err := HandleHelloWorld(context.Background(), map[string]interface{}{})
	if err != nil {
		t.Fatalf("HelloWorld: %v", err)
	}
	if !strings.Contains(resp.Content[0].Text, "Hello") {
		t.Errorf("HelloWorld = %q", resp.Content[0].Text)
	}
}

func TestSimpleEmbed(t *testing.T) {
	// Test via the memorystore package's exported function if available,
	// otherwise just verify the embedding path works through Commit
	t.Skip("simpleEmbed is internal to memorystore; tested indirectly via add_memory")
}
