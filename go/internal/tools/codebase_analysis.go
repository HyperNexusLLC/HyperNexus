package tools

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/repograph"
)

// ensureGraphBuilt ensures that the global repository graph is populated.
// Returns immediately if graph isn't ready — callers should use lightweight fallback.
func ensureGraphBuilt(ctx context.Context) error {
	if GlobalRepoGraph == nil {
		return fmt.Errorf("GlobalRepoGraph is not initialized")
	}
	if GlobalRepoGraph.GetGraph() != nil {
		return nil
	}
	// Try a quick build with short timeout
	buildCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	_, err := GlobalRepoGraph.Build(buildCtx)
	if err != nil {
		return fmt.Errorf("graph build timed out or failed: %w", err)
	}
	return nil
}

// HandleCodebaseSearch searches the codebase symbol/import/definition graph.
func HandleCodebaseSearch(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	query, okVal := getString(args, "query")
	if !okVal || query == "" {
		return err("missing required parameter 'query'")
	}

	mode, _ := getString(args, "mode")
	if mode == "" {
		mode = "symbols"
	}

	limit, okLimit := getInt(args, "limit")
	if !okLimit || limit <= 0 {
		limit = 20
	}

	if errBuild := ensureGraphBuilt(ctx); errBuild != nil {
		// Fallback: lightweight grep-based symbol search
		return lightweightSymbolSearch(query, limit)
	}

	var data interface{}
	switch strings.ToLower(mode) {
	case "definitions":
		data = GlobalRepoGraph.FindDefinitions(query)
	case "references":
		data = GlobalRepoGraph.FindReferences(query)
	case "symbols":
		data = GlobalRepoGraph.SearchSymbols(query, limit)
	default:
		return err(fmt.Sprintf("invalid search mode '%s'. Allowed: symbols, definitions, references", mode))
	}

	responseBytes, e := json.Marshal(data)
	if e != nil {
		return err(fmt.Sprintf("failed to marshal search results: %s", e.Error()))
	}

	return ok(string(responseBytes))
}

// HandleCodebaseOutline outlines symbols defined in a file or details a specific symbol.
func HandleCodebaseOutline(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	filePath, hasPath := getString(args, "filePath")
	symbolName, hasSymbol := getString(args, "symbolName")

	if !hasPath && !hasSymbol {
		return err("must provide either 'filePath' or 'symbolName'")
	}

	if errBuild := ensureGraphBuilt(ctx); errBuild != nil {
		return err(fmt.Sprintf("graph build failed: %v", errBuild))
	}

	if hasPath {
		// Clean filePath path separators for consistency
		cleanPath := filepathToSlash(filePath)
		graph := GlobalRepoGraph.GetGraph()
		if graph == nil {
			return err("graph is nil")
		}

		var fileNodes []*repograph.Node
		for _, node := range graph.Nodes {
			// Check path matches (ignoring node type NodeFile to list definition structures)
			if filepathToSlash(node.Path) == cleanPath && node.Type != repograph.NodeFile && node.Type != repograph.NodeImport {
				fileNodes = append(fileNodes, node)
			}
		}

		// Sort by line start to outline in sequential order
		sort.Slice(fileNodes, func(i, j int) bool {
			return fileNodes[i].LineStart < fileNodes[j].LineStart
		})

		responseBytes, e := json.Marshal(fileNodes)
		if e != nil {
			return err(fmt.Sprintf("failed to marshal file outline: %s", e.Error()))
		}
		return ok(string(responseBytes))
	}

	// Lookup specific symbol definition
	defs := GlobalRepoGraph.FindDefinitions(symbolName)
	responseBytes, e := json.Marshal(defs)
	if e != nil {
		return err(fmt.Sprintf("failed to marshal symbol definitions: %s", e.Error()))
	}
	return ok(string(responseBytes))
}

// Helper to convert windows path slashes to forward slashes to match repo graph structure.
func filepathToSlash(path string) string {
	return strings.ReplaceAll(path, "\\", "/")
}

// lightweightSymbolSearch is a fallback when the repo graph build times out.
// It does a simple regex scan of source files for symbol definitions.
func lightweightSymbolSearch(query string, limit int) (ToolResponse, error) {
	symbolRe := regexp.MustCompile(`(?i)(?:func|function|class|type|interface|struct|def)\s+(\w*` + regexp.QuoteMeta(query) + `\w*)`)
	cwd, _ := os.Getwd()
	var results []map[string]interface{}
	_ = filepath.Walk(cwd, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || len(results) >= limit {
			return nil
		}
		name := info.Name()
		ext := filepath.Ext(name)
		if ext != ".go" && ext != ".ts" && ext != ".js" && ext != ".py" {
			return nil
		}
		// Skip heavy directories
		for _, skip := range []string{"node_modules", ".git", "_disabled", "archive", "mcpimpl", "vendor"} {
			if strings.Contains(path, string(os.PathSeparator)+skip+string(os.PathSeparator)) {
				return nil
			}
		}
		f, openErr := os.Open(path)
		if openErr != nil {
			return nil
		}
		defer f.Close()
		scanner := bufio.NewScanner(f)
		lineNum := 0
		for scanner.Scan() && len(results) < limit {
			lineNum++
			line := scanner.Text()
			if matches := symbolRe.FindStringSubmatch(line); len(matches) > 1 {
				rel, _ := filepath.Rel(cwd, path)
				results = append(results, map[string]interface{}{
					"name": matches[1], "path": filepath.ToSlash(rel), "line": lineNum,
				})
			}
		}
		return nil
	})
	data, _ := json.Marshal(results)
	return ok(string(data))
}
