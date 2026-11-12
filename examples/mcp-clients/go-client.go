// HyperNexus MCP Go client example.
//
// Connects to the HyperNexus Go kernel HTTP API to list tools,
// search for a tool, and call it.
//
// Usage:
//
//	go run go-client.go
//	go run go-client.go -search "file read"
//	go run go-client.go -call run_python -args `{"code": "print(1+1)"}`
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
)

const base = "http://127.0.0.1:7778"

func get(path string) map[string]any {
	resp, err := http.Get(base + path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "GET %s: %v\n", path, err)
		os.Exit(1)
	}
	defer resp.Body.Close()
	var out map[string]any
	json.NewDecoder(resp.Body).Decode(&out)
	return out
}

func post(path string, body map[string]any) map[string]any {
	data, _ := json.Marshal(body)
	resp, err := http.Post(base+path, "application/json", bytes.NewReader(data))
	if err != nil {
		fmt.Fprintf(os.Stderr, "POST %s: %v\n", path, err)
		os.Exit(1)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var out map[string]any
	json.Unmarshal(raw, &out)
	return out
}

func main() {
	search := flag.String("search", "", "Search tools by query")
	call := flag.String("call", "", "Call a tool by name")
	argsJSON := flag.String("args", "{}", "JSON arguments for -call")
	flag.Parse()

	health := get("/health")
	fmt.Printf("Kernel: %v\n", health)

	switch {
	case *search != "":
		result := post("/api/mcp/tools/search", map[string]any{"query": *search})
		tools, _ := result["tools"].([]any)
		fmt.Printf("Found %d tools:\n", len(tools))
		for i, t := range tools {
			if i >= 10 {
				break
			}
			m := t.(map[string]any)
			fmt.Printf("  - %v: %.80v\n", m["name"], m["description"])
		}
	case *call != "":
		var toolArgs map[string]any
		json.Unmarshal([]byte(*argsJSON), &toolArgs)
		result := post("/api/mcp/tools/call", map[string]any{"tool": *call, "args": toolArgs})
		out, _ := json.MarshalIndent(result, "", "  ")
		fmt.Println(string(out))
	default:
		result := get("/api/mcp/tools")
		tools, _ := result["tools"].([]any)
		fmt.Printf("Available tools (%d):\n", len(tools))
		for i, t := range tools {
			if i >= 20 {
				fmt.Printf("  ... and %d more\n", len(tools)-20)
				break
			}
			m := t.(map[string]any)
			fmt.Printf("  - %v\n", m["name"])
		}
	}
}
